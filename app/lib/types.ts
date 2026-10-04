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
  notes?: string;
  book?: {
    id: string;
    title: string;
    coverUrl?: string;
    authors: string[];
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
// BOOK REQUESTS (Phase 3)
// ============================================================================

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

