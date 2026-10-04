# LibStack — System Architecture Summary

> **Generated:** 2026-10-04 | **Status:** Living document

---

## 1. High-Level Overview & Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | **16.3.6** |
| Language | TypeScript | ^5 |
| UI Styling | **Tailwind CSS v4** | ^4 |
| Icons | `lucide-react` | ^1.48 |
| Database & Auth backend | **Supabase** (PostgreSQL) | `@supabase/supabase-js` ^2.117 |
| CSS utility helpers | `clsx` + `tailwind-merge` | — |
| Font | Google Fonts — **Inter** (via `next/font`) | — |
| State management | React built-ins (`useState`, `useContext`, `useSyncExternalStore`) | — |
| Form handling | Native HTML forms (no form library) | — |

**Router:** App Router (`app/` directory), but every page uses `'use client'` — there are **no Server Components** or Server Actions yet; all pages are pure Client Components.

**Image hosting:** OpenLibrary CDN (`covers.openlibrary.org`) — whitelisted via `next.config.ts` `remotePatterns`.

---

## 2. Project Directory Structure

```
nextjs-supabase-library/
├── app/
│   ├── layout.tsx                 # Root layout — wraps app in <AuthProvider> + <AdminLoginModal>
│   ├── globals.css                # Global Tailwind v4 styles
│   ├── page.tsx                   # "/" — Book Catalog page (main view)
│   ├── issue-return/
│   │   └── page.tsx               # "/issue-return" — Circulation tracker
│   ├── members/
│   │   └── page.tsx               # "/members" — Member management
│   ├── settings/
│   │   └── page.tsx               # "/settings" — Connectivity, export, loan config
│   ├── components/
│   │   ├── AddBookModal.tsx        # Full multi-step add-book form (31 KB)
│   │   ├── EditBookModal.tsx       # Thin wrapper re-using AddBookModal in edit mode
│   │   ├── BookCard.tsx            # Individual book tile with actions
│   │   ├── FilterPills.tsx         # Genre filter chip row
│   │   ├── NewIssueModal.tsx       # Issue a book to a member (18 KB)
│   │   ├── MemberModal.tsx         # Create / edit member form
│   │   ├── AdminLoginModal.tsx     # Passcode-gated admin login overlay
│   │   ├── Navbar.tsx              # Top bar — search + dark-mode toggle
│   │   ├── Sidebar.tsx             # Desktop collapsible sidebar nav
│   │   ├── BottomNav.tsx           # Mobile bottom nav bar
│   │   └── AppLayout.tsx           # Shared shell used by sub-pages
│   ├── context/
│   │   └── AuthContext.tsx         # Global auth state via React Context
│   └── lib/
│       ├── supabase.ts             # Supabase client + ALL DB operations (612 lines)
│       ├── types.ts                # Shared TypeScript interfaces & enums
│       └── utils.ts                # cn() helper (clsx + tailwind-merge)
├── supabase/
│   ├── schema.sql                  # Complete DB schema + seed data (323 lines)
│   ├── libstack_books_2026-09-29.csv  # Seed CSV export
│   └── supabase-schema-ukebwcmnbncugxehxoxn.png  # ERD screenshot
├── public/
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env                            # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ADMIN_PASSWORD
```

---

## 3. Supabase Database Schema & Data Models

### Extensions
```sql
CREATE EXTENSION pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION citext;     -- case-insensitive text (authors, genres)
```

### Enums
| Type | Values |
|---|---|
| `book_availability` | `available`, `issued` |
| `member_status` | `active`, `suspended` |
| `issue_status` | `active`, `returned`, `overdue` |

---

### Table: `authors`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `citext` | NOT NULL, UNIQUE |
| `created_at` | `timestamptz` | NOT NULL, `now()` |

---

### Table: `genres`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `citext` | NOT NULL, UNIQUE |
| `created_at` | `timestamptz` | NOT NULL |

---

### Table: `shelf_locations`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `shelf_code` | `text` | NOT NULL, non-blank |
| `row_label` | `text` | NOT NULL, non-blank |
| `slot_label` | `text` | NOT NULL, non-blank |
| `created_at` | `timestamptz` | NOT NULL |
| — | — | UNIQUE(`shelf_code`, `row_label`, `slot_label`) |

---

### Table: `books` ⭐ Core entity
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `legacy_id` | `text` | UNIQUE (migration compat) |
| `title` | `text` | NOT NULL, non-blank |
| `subtitle` | `text` | nullable |
| `language` | `text` | NOT NULL |
| `is_translated` | `boolean` | NOT NULL, default `false` |
| `original_language` | `text` | nullable; required when `is_translated=true` (CHECK) |
| `shelf_location_id` | `uuid` | FK → `shelf_locations(id)` ON DELETE RESTRICT |
| `copies` | `integer` | CHECK `1–9999` |
| `published_year` | `integer` | CHECK `1000–9999` |
| `cover_url` | `text` | nullable |
| `availability` | `book_availability` | NOT NULL, default `available` |
| `isbn` | `text` | UNIQUE, nullable; regex `^[0-9Xx-]+$` |
| `created_at` / `updated_at` | `timestamptz` | auto-managed |

**Trigger:** `books_set_updated_at` — sets `updated_at = now()` BEFORE UPDATE.

**Indexes:** `availability`, `language`, `published_year`.

---

### Table: `book_authors` (junction)
| Column | Type | Constraints |
|---|---|---|
| `book_id` | `uuid` | FK → `books(id)` ON DELETE CASCADE |
| `author_id` | `uuid` | FK → `authors(id)` ON DELETE RESTRICT |
| `author_order` | `smallint` | ≥ 0; drives display ordering |
| — | — | PK(`book_id`, `author_id`); UNIQUE(`book_id`, `author_order`) |

---

### Table: `book_genres` (junction)
| Column | Type | Constraints |
|---|---|---|
| `book_id` | `uuid` | FK → `books(id)` ON DELETE CASCADE |
| `genre_id` | `uuid` | FK → `genres(id)` ON DELETE RESTRICT |
| `genre_order` | `smallint` | ≥ 0 |
| — | — | PK(`book_id`, `genre_id`); UNIQUE(`book_id`, `genre_order`) |

---

### Table: `members` (Phase 2)
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `member_code` | `text` | NOT NULL, UNIQUE, non-blank (e.g. `MEM-001`) |
| `full_name` | `text` | NOT NULL, non-blank |
| `email` | `text` | UNIQUE, nullable; regex validated |
| `phone` | `text` | nullable |
| `status` | `member_status` | NOT NULL, default `active` |
| `created_at` / `updated_at` | `timestamptz` | auto-managed |

**Trigger:** `members_set_updated_at`.

**Indexes:** `member_code`, `status`.

---

### Table: `book_issues` (Phase 2)
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `book_id` | `uuid` | FK → `books(id)` ON DELETE RESTRICT |
| `member_id` | `uuid` | FK → `members(id)` ON DELETE RESTRICT |
| `issued_at` | `timestamptz` | NOT NULL, `now()` |
| `due_date` | `timestamptz` | NOT NULL |
| `returned_at` | `timestamptz` | nullable |
| `status` | `issue_status` | NOT NULL, default `active` |
| `notes` | `text` | nullable |
| `created_at` / `updated_at` | `timestamptz` | auto-managed |

**Trigger:** `book_issues_set_updated_at`.

**Indexes:** `book_id`, `member_id`, `status`, `due_date`.

---

### Row Level Security (RLS)

> [!WARNING]
> Current policies are **wide-open development stubs** — identical permissive policies exist on all 8 tables, allowing full read/write access to both `anon` and `authenticated` roles. These must be replaced before any production deployment.

Policy pattern applied to every table:
```sql
CREATE POLICY "Public read access"   ON public.<table> FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert access" ON public.<table> FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update access" ON public.<table> FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete access" ON public.<table> FOR DELETE TO anon, authenticated USING (true);
```

### DB Functions
| Function | Type | Description |
|---|---|---|
| `public.set_updated_at()` | Trigger function | Sets `NEW.updated_at = now()` — shared by books, members, book_issues triggers |

---

## 4. Authentication & Role-Based Access

### Architecture: Client-Side Passcode, Not Supabase Auth

**Supabase Auth is NOT used.** The project implements a bespoke, localStorage-based admin gate:

```
NEXT_PUBLIC_ADMIN_PASSWORD (env var)
       │
       ▼
AdminLoginModal.tsx  ──→  AuthContext.login(password)
                                    │
                          localStorage.setItem('libstack_admin_auth', 'true')
                                    │
                          window.dispatchEvent('libstack_auth_change')
                                    │
                    AuthContext uses useSyncExternalStore
                    to reactively expose isAdmin: boolean
```

### Key AuthContext API
| Member | Type | Description |
|---|---|---|
| `isAdmin` | `boolean` | Hydrated from `localStorage` via `useSyncExternalStore`; `false` during SSR |
| `login(password)` | `(string) => boolean` | Compares against env var; sets localStorage on success |
| `logout()` | `() => void` | Clears localStorage |
| `openLoginModal(reason?)` | `(string?) => void` | Opens the passcode dialog with optional context message |
| `isLoginModalOpen` | `boolean` | Controls `AdminLoginModal` render |

### Roles (Two-Tier)

| Role | Identifier | Capabilities |
|---|---|---|
| **Member / Guest** | `isAdmin === false` | View catalog, browse members list, view circulation history |
| **Admin (Librarian)** | `isAdmin === true` | Add / Edit / Delete books, Create / Edit / Delete members, Issue / Return books, Export data, Change circulation settings |

### Permission Enforcement Pattern
All write actions check `isAdmin` at the UI level. Protected buttons/FABs are conditionally rendered; if a guest triggers a protected action, `openLoginModal(reason)` is called to prompt authentication. **There is no server-side enforcement** — Supabase RLS is permissive.

### No Middleware / No Cookie Auth
No `middleware.ts` exists. No server-side session management. The entire auth model is a client-side UI toggle backed by `localStorage`.

---

## 5. Key Modules & Business Logic

### 5.1 Book Catalog (`app/page.tsx`)

**Data Loading:**
- On mount, fetches all books with a deep join via `bookSelect` (joins `shelf_locations`, `book_authors→authors`, `book_genres→genres`).
- `loadBooks()` callback is reused after mutations (create, update, delete, return).

**Search:** Client-side, runs on `books[]` state. Matches against:
- `title` (case-insensitive substring)
- Each `author` name
- `isbn`
- `subtitle`

**Filter:** Single genre filter pill (`activeGenre`). Applied via `useMemo` on `filteredBooks`.

**Pagination:** ❌ **Not implemented** — all books are fetched and filtered in-memory.

**Stock / Availability:**
- The `books.availability` enum is a single-value flag (`available` | `issued`), toggled atomically when a book is issued or returned.
- `copies` tracks total physical copies but is not decremented per loan — the system treats the book title as either available or fully issued (not per-copy tracking).

**Stats Dashboard (computed in `useMemo`):**
```
Total Volumes  = Σ book.copies
Available      = count(books where availability === 'available')
Issued         = count(books where availability === 'issued')
Genres         = count(distinct genres)
```

---

### 5.2 Borrow / Return Workflow

**Issue Flow (`createBookIssue` in `supabase.ts`):**
1. Insert row into `book_issues` with `status: 'active'`, `issued_at: now()`, `due_date` (user-selected).
2. Update `books.availability` → `'issued'`.

**Return Flow — Two paths:**

| Function | Trigger | Behavior |
|---|---|---|
| `returnBookIssue(issueId, bookId)` | From Circulation page (specific issue record known) | Updates `book_issues.returned_at`, `status='returned'`; then sets `books.availability='available'` |
| `returnBookByBookId(bookId)` | From Catalog page (issue record ID unknown) | Queries latest `book_issues` row where `returned_at IS NULL`, updates it; always resets `books.availability` |

**Overdue Detection (client-side only):**
```typescript
// In mapBookIssueRowToIssue()
if (!row.returned_at && status === 'active' && now > dueDate) {
  status = 'overdue';
}
```
> [!NOTE]
> The `overdue` status in `book_issues` is **not written back to the database** — it is a computed display state derived at read time. No scheduled job or DB trigger marks records overdue.

**Fines / Penalties:** ❌ **Not implemented.** No fine calculation exists.

**`due_date` default:** Set by the user via `NewIssueModal`; the Settings page stores a `libstack_loan_duration` preference in `localStorage` (default 14 days) but this value is **not wired** into `NewIssueModal`'s default date pre-fill.

---

### 5.3 Member Management (`app/members/page.tsx`)

**CRUD operations** (all via direct Supabase client SDK):
- **List:** `fetchMembers()` — selects all members + joined `book_issues(id, status)` to compute `activeLoansCount`.
- **Create:** `createMember(data)` — inserts with `member_code` uppercased.
- **Update:** `updateMember(id, data)`.
- **Delete:** `deleteMember(id)` — performs a pre-check: blocks deletion if any `active` or `overdue` issues exist.

**Search:** Client-side filter on `member_code`, `fullName`, `email`, `phone`.

**Status Filter:** `all | active | suspended` dropdown.

**Member codes** follow a `MEM-NNN` convention (enforced by convention, no DB sequence generator).

---

## 6. Data Fetching & API Architecture

### No Server Actions, No Route Handlers

The project uses **exclusively client-side Supabase SDK calls** (`@supabase/supabase-js` browser client):

```typescript
// app/lib/supabase.ts
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY   // Public anon key only
);
```

All database operations are exported as plain async functions from `app/lib/supabase.ts` and called directly from Client Components.

### Data Fetching Pattern

| Operation | Pattern | Location |
|---|---|---|
| Initial page load | `useEffect` → direct SDK `.select()` | All page components |
| Post-mutation refresh | `loadData()` callback invoked after CUD ops | All page components |
| Real-time updates | ❌ Not implemented (no Supabase Realtime subscriptions) | — |
| Server-side fetching | ❌ Not used | — |
| Route Handlers (`/api/*`) | ❌ None exist | — |
| Server Actions | ❌ None exist | — |

### Caching & Revalidation

There is **no Next.js data caching** in place (`fetch()` is not used; all queries go through the Supabase SDK which bypasses Next.js cache). Data is manually refreshed by calling `loadBooks()` / `loadData()` after mutations.

### Key Query Patterns

```typescript
// Deep join — books with relations
const bookSelect = `
  id, title, subtitle, language, is_translated, original_language,
  copies, published_year, cover_url, availability, isbn,
  shelf_locations (shelf_code, row_label, slot_label),
  book_authors (author_order, authors (name)),
  book_genres (genre_order, genres (name))
`;

// Circulation with joins
const bookIssueSelect = `
  id, book_id, member_id, issued_at, due_date, returned_at, status, notes,
  books (id, title, cover_url, book_authors (authors (name))),
  members (id, member_code, full_name, email, phone)
`;
```

### Row Mapping Layer

A clean DTO-mapping layer decouples DB row shapes from domain types:

```
BookRow      → mapBookRowToBook()   → Book
MemberRow    → mapMemberRowToMember() → Member
BookIssueRow → mapBookIssueRowToIssue() → BookIssue
```

### Author/Genre Sync Strategy

A replace-all pattern is used for many-to-many relations on book create/update:
1. Upsert all author/genre names to lookup tables.
2. Delete all existing junction rows for the book.
3. Re-insert junction rows with correct `_order` values.

---

## 7. Current Status & Known Gaps

### ✅ Completed Modules

| Module | Status |
|---|---|
| Book catalog (list, search, genre filter) | ✅ Complete |
| Add Book (full form with authors, genres, shelf, translation) | ✅ Complete |
| Edit Book | ✅ Complete |
| Delete Book | ✅ Complete |
| Book issue (new loan workflow) | ✅ Complete |
| Book return (from catalog + from circulation page) | ✅ Complete |
| Member CRUD (create, read, update, delete) | ✅ Complete |
| Admin passcode auth + UI gating | ✅ Complete |
| Dark mode (CSS class toggle) | ✅ Complete |
| Supabase connectivity test (settings page) | ✅ Complete |
| Data export to CSV/JSON (settings page) | ✅ Complete |
| Database schema + seed data | ✅ Complete |

### ⚠️ Work In Progress / Known Gaps

| Area | Issue |
|---|---|
| **RLS / Security** | All policies are wide-open (`USING (true)`). Any anonymous user can read, write, or delete all data. Must be replaced with role-scoped policies pre-launch. |
| **Authentication** | No real Supabase Auth — passcode is stored in `NEXT_PUBLIC_*` env var (client-visible). No JWT, no server session. |
| **Overdue status persistence** | `overdue` is only computed client-side; no DB-level job or trigger marks records overdue. |
| **Fines / Penalties** | No fine calculation, due-date penalty tracking, or fine collection workflow. |
| **Pagination** | Catalog fetches all books in one query. No server-side pagination or infinite scroll. |
| **Loan duration wiring** | `libstack_loan_duration` setting is saved to `localStorage` but not consumed by `NewIssueModal` default date. |
| **Per-copy tracking** | `copies` column exists but the system treats book availability as a binary flag, not per-copy inventory. |
| **Realtime** | No Supabase Realtime subscriptions — multi-tab or multi-user updates require manual refresh. |
| **Server Components / SSR** | Every page is `'use client'`. No SEO-friendly server rendering of data, no streaming. |
| **ISBN on Add Book form** | `AddBookFormData` has no `isbn` field — new books always get `isbn: null`. |
| **Member loans cap enforcement** | `libstack_max_loans` setting is stored in `localStorage` but not enforced when creating a new issue. |
| **Overdue borrowing setting** | `libstack_allow_overdue` is saved but not enforced in `createBookIssue`. |
| **Mobile search UX** | Mobile search bar is implemented but the desktop navbar search and mobile search are separate state, not unified. |
| **Error handling** | Errors surface as inline text banners; no toast system, no structured error boundaries. |
