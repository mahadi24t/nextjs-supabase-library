export type BookAvailability = 'available' | 'issued';

export interface BookAuthor {
  name: string;
}

export interface ShelfLocation {
  shelf: string;
  row: string;
  slot: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  genres: string[];
  language: 'English' | 'Bengali' | string;
  isTranslated: boolean;
  originalLanguage?: string;
  location: ShelfLocation;
  copies: number;
  publishedYear: number;
  coverUrl?: string;
  availability: BookAvailability;
  isbn?: string;
}

export interface AddBookFormData {
  title: string;
  subtitle: string;
  authors: string[];
  language: string;
  isTranslated: boolean;
  originalLanguage: string;
  genres: string[];
  shelf: string;
  row: string;
  slot: string;
  copies: number;
  publishedYear: number;
  coverUrl: string;
}

export type MemberStatus = 'active' | 'suspended';

export interface Member {
  id: string;
  memberCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  createdAt: string;
  activeLoansCount?: number;
}

export interface MemberFormData {
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  status: MemberStatus;
}

export type BookIssueStatus = 'active' | 'returned' | 'overdue';

export interface BookIssue {
  id: string;
  bookId: string;
  memberId: string;
  issuedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: BookIssueStatus;
  returnRequested?: boolean;
  returnRequestedAt?: string | null;
  notes?: string;
  book?: {
    id: string;
    title: string;
    coverUrl?: string;
    authors: string[];
    location?: ShelfLocation;
  };
  member?: {
    id: string;
    memberCode: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
}

export interface CreateIssueFormData {
  bookId: string;
  memberId: string;
  dueDate: string;
  notes?: string;
}

// ============================================================================
// INVENTORY & CIRCULATION (Phase 1 & 2)
// ============================================================================

export interface InventoryStatus {
  totalCopies: number;
  activeLoansCount: number;
  availableCopies: number;
  isAvailable: boolean;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface BookRequest {
  id: string;
  bookId: string;
  memberId: string;
  status: RequestStatus;
  requestNotes?: string;
  createdAt: string;
  updatedAt: string;
  book?: {
    id: string;
    title: string;
    coverUrl?: string;
    availability: BookAvailability;
    copies?: number;
    authors?: string[];
  };
  member?: {
    id: string;
    memberCode: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
}

// ============================================================================
// NOTIFICATIONS (Phase 5)
// ============================================================================

export interface LibrarianNotificationSummary {
  totalCount: number;
  borrowRequests: Array<{
    id: string;
    bookTitle: string;
    memberName: string;
    memberCode: string;
    createdAt: string;
  }>;
  returnRequests: Array<{
    id: string;
    bookTitle: string;
    memberName: string;
    memberCode: string;
    requestedAt: string;
  }>;
}

export type LibrarianNotifications = LibrarianNotificationSummary;

export type MemberNotificationType =
  | 'request_approved'
  | 'request_rejected'
  | 'loan_due_soon'
  | 'loan_overdue';

export interface MemberNotificationItem {
  id: string;
  type: MemberNotificationType;
  title: string;
  message: string;
  timestamp: string;
  bookTitle: string;
}

export interface MemberNotificationSummary {
  totalCount: number;
  items: MemberNotificationItem[];
}

