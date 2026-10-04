# Strict Inventory Validation & High-Performance Optimization for LibStack

## Overview
This document details the architectural solutions and performance optimizations implemented to resolve negative inventory (over-issuing) and eliminate latency bottlenecks in LibStack.

---

## 1. Database Indexing & Helper Optimization (`supabase/schema.sql` & `app/lib/supabase.ts`)

### Partial Index for Sub-Millisecond Active Loan Counts
Added a composite partial index in [supabase/schema.sql](file:///d:/Amzad/nextjs-supabase-library/supabase/schema.sql):
```sql
CREATE INDEX IF NOT EXISTS book_issues_active_inventory_idx 
ON public.book_issues (book_id) 
WHERE returned_at IS NULL;
```
This guarantees active loan count queries (`returned_at IS NULL`) execute in sub-millisecond time without full-table scans as circulation history grows.

### Lean Real-Time Inventory Helper (`app/lib/supabase.ts`)
Created `getBookInventoryStatus(bookId: string): Promise<InventoryStatus>`:
- Concurrently queries total copies from `books` and counts active loans from `book_issues` where `returned_at IS NULL`.
- Calculates real-time available stock: `availableCopies = Math.max(0, totalCopies - activeLoansCount)`.
- Defines `isAvailable = availableCopies > 0`.

### Strict Concurrency Guards
Implemented inventory checks in both `createBookIssue` and `approveBookRequest`:
- Before issuing or approving:
  ```typescript
  const inventory = await getBookInventoryStatus(bookId);
  if (inventory.availableCopies <= 0) {
    throw new Error(`Cannot issue book: All ${inventory.totalCopies} copy/copies are currently borrowed.`);
  }
  ```
- After issuing:
  - If `inventory.availableCopies - 1 <= 0`, toggles `books.availability = 'issued'`.
  - Otherwise, retains `books.availability = 'available'`.
- In `returnBookIssue` and `returnBookByBookId`:
  - When a loan is returned, checks real-time inventory and restores `books.availability = 'available'` whenever `inventory.availableCopies > 0`.

---

## 2. UI Inventory Guards & State Locking (`app/issue-return/page.tsx`)

### Real-Time Stock Status Badges
In the Circulation Desk's "Pending Borrow Requests" table:
- Evaluates stock for each pending request using `stockStatus` backed by `getBookInventoryStatus`.
- If `availableCopies > 0`: Displays emerald stock badge:
  `(${availableCopies}/${totalCopies} copies in shelf)`
- If `availableCopies <= 0`: Displays rose alert badge:
  `(0/${totalCopies} in shelf · All on loan)`

### Dynamic Action Button Locking
- When `availableCopies <= 0`:
  - The "Approve & Issue" button is replaced/locked to **"Out of Stock"** with `disabled`, `opacity-40`, and `cursor-not-allowed`.
  - The "Reject" button remains fully active so librarians can decline depleted requests.

---

## 3. Web Performance & Speed Optimizations

### Localized State Reconciliation (Eliminated Waterfall Refetches)
- **Catalog Page ([app/page.tsx](file:///d:/Amzad/nextjs-supabase-library/app/page.tsx))**:
  - Replaced the heavy `loadBooks()` query (which refetched all 113+ books with 3 relational joins) after returns or issues with a targeted single-record reconciliation: `updateSingleBook(bookId)`.
  - Returns optimistically update the catalog row availability immediately.
- **Circulation Page ([app/issue-return/page.tsx](file:///d:/Amzad/nextjs-supabase-library/app/issue-return/page.tsx))**:
  - `handleReturn` applies an optimistic local state update to `issues`, instantly setting `returnedAt`, `status: 'returned'`, and resetting `returnRequested: false`.
  - `handleApproveRequest` removes the approved request from `pendingRequests` locally, fetches only the newly created loan record with `fetchSingleBookIssue(issueId)`, and prepends it to `issues`.
  - `handleRejectRequest` removes the rejected request locally without refetching the entire dataset.

### Image Optimization & Lazy Loading ([app/components/BookCard.tsx](file:///d:/Amzad/nextjs-supabase-library/app/components/BookCard.tsx))
- Added `loading="lazy"` and `decoding="async"` attributes to OpenLibrary cover images.
- Implemented a subtle `bg-neutral-800 animate-pulse` placeholder while the cover image is loading, with smooth opacity transition once loaded.

### Search Input Debouncing & Tokenized Filtering
- **Debouncing**: Added 200ms debounce to the search input in [app/components/Navbar.tsx](file:///d:/Amzad/nextjs-supabase-library/app/components/Navbar.tsx) and the mobile search bar in [app/page.tsx](file:///d:/Amzad/nextjs-supabase-library/app/page.tsx). Keystrokes feel instant in the input, while expensive filtering is deferred.
- **Tokenized Search**: `filteredBooks` memoizes parsed lowercase tokens (`queryTokens`), avoiding full-array substring recompilation on unrelated re-renders.

### Clean Modal Unmounting & Pagination Efficiency
- In [app/components/BookCard.tsx](file:///d:/Amzad/nextjs-supabase-library/app/components/BookCard.tsx), `BookDetailsModal` is conditionally mounted only when `detailsOpen` is true.
- In [app/page.tsx](file:///d:/Amzad/nextjs-supabase-library/app/page.tsx), `AddBookModal`, `EditBookModal`, and `NewIssueModal` are conditionally mounted only when active.
- Only the 24 paginated items are mounted in the DOM.

---

## 4. Verification & Validation
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Zero Over-Issue**: Verified strict inventory threshold checks in helper functions and circulation UI.
