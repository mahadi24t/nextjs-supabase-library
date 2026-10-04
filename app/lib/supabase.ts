import { createClient } from '@supabase/supabase-js';
import type {
  AddBookFormData,
  Book,
  BookAvailability,
  ShelfLocation,
  Member,
  MemberFormData,
  BookIssue,
  BookIssueStatus,
  CreateIssueFormData,
  RequestStatus,
  BookRequest,
  LibrarianNotificationSummary,
  MemberNotificationSummary,
  MemberNotificationItem,
  InventoryStatus,
} from '@/app/lib/types';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// Safe to use in Client Components: this uses only the public anonymous key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type NamedRelation = { name: string } | null;
type OrderedRelation = {
  author_order?: number;
  genre_order?: number;
  authors?: NamedRelation;
  genres?: NamedRelation;
};

export interface ShelfLocationRow {
  shelf_code: string;
  row_label: string;
  slot_label: string;
}

export interface BookRow {
  id: string;
  title: string;
  subtitle: string | null;
  language: string;
  is_translated: boolean;
  original_language: string | null;
  copies: number;
  published_year: number;
  cover_url: string | null;
  availability: BookAvailability;
  isbn: string | null;
  shelf_locations: ShelfLocationRow | ShelfLocationRow[] | null;
  book_authors: Array<{
    author_order: number;
    authors: NamedRelation;
  }>;
  book_genres: Array<{
    genre_order: number;
    genres: NamedRelation;
  }>;
}

export const bookSelect = `
  id, title, subtitle, language, is_translated, original_language,
  copies, published_year, cover_url, availability, isbn,
  shelf_locations (shelf_code, row_label, slot_label),
  book_authors (author_order, authors (name)),
  book_genres (genre_order, genres (name))
`;

function namesInOrder(
  relations: OrderedRelation[],
  orderKey: 'author_order' | 'genre_order',
): string[] {
  return [...relations]
    .sort((a, b) => (a[orderKey] ?? 0) - (b[orderKey] ?? 0))
    .flatMap((relation) => relation.authors?.name ?? relation.genres?.name ?? []);
}

export function mapBookRowToBook(row: BookRow): Book {
  const shelfLocation = Array.isArray(row.shelf_locations)
    ? row.shelf_locations[0]
    : row.shelf_locations;

  if (!shelfLocation) {
    throw new Error(`Book ${row.id} has no shelf location.`);
  }

  const location: ShelfLocation = {
    shelf: shelfLocation.shelf_code,
    row: shelfLocation.row_label,
    slot: shelfLocation.slot_label,
  };

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    authors: namesInOrder(row.book_authors, 'author_order'),
    genres: namesInOrder(row.book_genres, 'genre_order'),
    language: row.language,
    isTranslated: row.is_translated,
    originalLanguage: row.original_language ?? undefined,
    location,
    copies: row.copies,
    publishedYear: row.published_year,
    coverUrl: row.cover_url ?? undefined,
    availability: row.availability,
    isbn: row.isbn ?? undefined,
  };
}

// Backwards-compatible name for existing callers.
export const toBook = mapBookRowToBook;

/** Maps form fields to the scalar columns for a new books row. */
export function toBookInsert(data: AddBookFormData) {
  return {
    title: data.title.trim(),
    subtitle: data.subtitle.trim() || null,
    language: data.language,
    is_translated: data.isTranslated,
    original_language: data.isTranslated ? data.originalLanguage.trim() || 'English' : null,
    copies: data.copies,
    published_year: data.publishedYear,
    cover_url: data.coverUrl.trim() || null,
    availability: 'available' as const,
    // AddBookFormData has no isbn field; preserve null until the form adds one.
    isbn: null,
  };
}

export function toBookUpdate(data: AddBookFormData, existingBook?: Book | null) {
  return {
    title: data.title.trim(),
    subtitle: data.subtitle.trim() || null,
    language: data.language,
    is_translated: data.isTranslated,
    original_language: data.isTranslated ? data.originalLanguage.trim() || 'English' : null,
    copies: data.copies,
    published_year: data.publishedYear,
    cover_url: data.coverUrl.trim() || null,
    ...(existingBook?.availability ? { availability: existingBook.availability } : {}),
    ...(existingBook?.isbn !== undefined ? { isbn: existingBook.isbn } : {}),
  };
}

export function toShelfLocationInsert(data: { shelf: string; row: string; slot: string }) {
  return {
    shelf_code: data.shelf.trim() || '?',
    row_label: data.row.trim() || '?',
    slot_label: data.slot.trim() || '?',
  };
}

export function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();

  return values.reduce<string[]>((names, value) => {
    const name = value.trim();
    const key = name.toLocaleLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
    return names;
  }, []);
}

export async function upsertShelfLocation(location: {
  shelf: string;
  row: string;
  slot: string;
}): Promise<string> {
  const insertData = toShelfLocationInsert(location);

  const { data, error } = await supabase
    .from('shelf_locations')
    .upsert(insertData, {
      onConflict: 'shelf_code,row_label,slot_label',
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data || typeof data.id !== 'string') {
    throw new Error('Supabase did not return the saved shelf location ID.');
  }

  return data.id;
}

export async function syncBookAuthors(bookId: string, authorNames: string[]): Promise<void> {
  const names = uniqueNames(authorNames.length ? authorNames : ['Unknown']);

  // 1. Ensure all authors exist in authors table
  const { error: authorUpsertError } = await supabase
    .from('authors')
    .upsert(names.map((name) => ({ name })), { onConflict: 'name' });
  if (authorUpsertError) throw authorUpsertError;

  // 2. Resolve author IDs
  const { data: authors, error: authorsError } = await supabase
    .from('authors')
    .select('id, name')
    .in('name', names);
  if (authorsError) throw authorsError;

  const savedAuthors = (authors ?? []) as Array<{ id: string; name: string }>;
  const authorIds = new Map(
    savedAuthors.map((author) => [author.name.toLocaleLowerCase(), author.id]),
  );

  // 3. Remove obsolete relations for this book
  const { error: deleteError } = await supabase
    .from('book_authors')
    .delete()
    .eq('book_id', bookId);
  if (deleteError) throw deleteError;

  // 4. Insert links with author_order
  const links = names.map((name, author_order) => {
    const author_id = authorIds.get(name.toLocaleLowerCase());
    if (!author_id) throw new Error(`Could not find author "${name}" after saving it.`);
    return { book_id: bookId, author_id, author_order };
  });

  if (links.length > 0) {
    const { error: linkError } = await supabase.from('book_authors').insert(links);
    if (linkError) throw linkError;
  }
}

export async function syncBookGenres(bookId: string, genreNames: string[]): Promise<void> {
  const names = uniqueNames(genreNames);

  // 1. If any genres, ensure they exist in genres table
  if (names.length > 0) {
    const { error: genreUpsertError } = await supabase
      .from('genres')
      .upsert(names.map((name) => ({ name })), { onConflict: 'name' });
    if (genreUpsertError) throw genreUpsertError;
  }

  // 2. Resolve genre IDs
  let genreIds = new Map<string, string>();
  if (names.length > 0) {
    const { data: genres, error: genresError } = await supabase
      .from('genres')
      .select('id, name')
      .in('name', names);
    if (genresError) throw genresError;

    const savedGenres = (genres ?? []) as Array<{ id: string; name: string }>;
    genreIds = new Map(
      savedGenres.map((genre) => [genre.name.toLocaleLowerCase(), genre.id]),
    );
  }

  // 3. Remove obsolete relations for this book
  const { error: deleteError } = await supabase
    .from('book_genres')
    .delete()
    .eq('book_id', bookId);
  if (deleteError) throw deleteError;

  // 4. Insert links with genre_order
  if (names.length > 0) {
    const links = names.map((name, genre_order) => {
      const genre_id = genreIds.get(name.toLocaleLowerCase());
      if (!genre_id) throw new Error(`Could not find genre "${name}" after saving it.`);
      return { book_id: bookId, genre_id, genre_order };
    });

    const { error: linkError } = await supabase.from('book_genres').insert(links);
    if (linkError) throw linkError;
  }
}

export async function createBook(data: AddBookFormData): Promise<string> {
  const shelfLocationId = await upsertShelfLocation({
    shelf: data.shelf,
    row: data.row,
    slot: data.slot,
  });

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      ...toBookInsert(data),
      shelf_location_id: shelfLocationId,
    })
    .select('id')
    .single();

  if (bookError) throw bookError;
  if (!book || typeof book.id !== 'string') {
    throw new Error('Supabase did not return the saved book ID.');
  }

  await syncBookAuthors(book.id, data.authors);
  await syncBookGenres(book.id, data.genres);

  return book.id;
}

export async function updateBook(
  bookId: string,
  data: AddBookFormData,
  existingBook?: Book | null,
): Promise<void> {
  const shelfLocationId = await upsertShelfLocation({
    shelf: data.shelf,
    row: data.row,
    slot: data.slot,
  });

  const { error: bookError } = await supabase
    .from('books')
    .update({
      ...toBookUpdate(data, existingBook),
      shelf_location_id: shelfLocationId,
    })
    .eq('id', bookId);

  if (bookError) throw bookError;

  await syncBookAuthors(bookId, data.authors);
  await syncBookGenres(bookId, data.genres);
}

// ============================================================================
// MEMBERS MODULE OPERATIONS
// ============================================================================

export interface MemberRow {
  id: string;
  member_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  book_issues?: Array<{ id: string; status: string }>;
}

export function mapMemberRowToMember(row: MemberRow): Member {
  const activeLoansCount = Array.isArray(row.book_issues)
    ? row.book_issues.filter((issue) => issue.status === 'active' || issue.status === 'overdue').length
    : 0;

  return {
    id: row.id,
    memberCode: row.member_code,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    activeLoansCount,
  };
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, member_code, full_name, email, phone, status, created_at, book_issues (id, status)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as MemberRow[]).map(mapMemberRowToMember);
}

export async function createMember(data: MemberFormData): Promise<Member> {
  const insertPayload = {
    member_code: data.memberCode.trim().toUpperCase(),
    full_name: data.fullName.trim(),
    email: data.email.trim() || null,
    phone: data.phone.trim() || null,
    status: data.status,
  };

  const { data: member, error } = await supabase
    .from('members')
    .insert(insertPayload)
    .select('id, member_code, full_name, email, phone, status, created_at')
    .single();

  if (error) throw error;
  if (!member) throw new Error('Supabase did not return the created member.');

  return {
    id: member.id,
    memberCode: member.member_code,
    fullName: member.full_name,
    email: member.email,
    phone: member.phone,
    status: member.status,
    createdAt: member.created_at,
    activeLoansCount: 0,
  };
}

export async function updateMember(id: string, data: MemberFormData): Promise<void> {
  const updatePayload = {
    member_code: data.memberCode.trim().toUpperCase(),
    full_name: data.fullName.trim(),
    email: data.email.trim() || null,
    phone: data.phone.trim() || null,
    status: data.status,
  };

  const { error } = await supabase
    .from('members')
    .update(updatePayload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteMember(id: string): Promise<void> {
  const { data: issues, error: checkError } = await supabase
    .from('book_issues')
    .select('id, status')
    .eq('member_id', id)
    .in('status', ['active', 'overdue']);

  if (!checkError && issues && issues.length > 0) {
    throw new Error(`Cannot delete member with ${issues.length} active/overdue book loan(s).`);
  }

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// CIRCULATION MODULE OPERATIONS (BOOK ISSUES / LOANS)
// ============================================================================

export interface BookIssueRow {
  id: string;
  book_id: string;
  member_id: string;
  issued_at: string;
  due_date: string;
  returned_at: string | null;
  status: 'active' | 'returned' | 'overdue';
  return_requested?: boolean;
  return_requested_at?: string | null;
  notes: string | null;
  books?: {
    id: string;
    title: string;
    cover_url: string | null;
    shelf_locations?: ShelfLocationRow | ShelfLocationRow[] | null;
    book_authors?: Array<{ authors: { name: string } | null }>;
  } | null;
  members?: {
    id: string;
    member_code: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export function mapBookIssueRowToIssue(row: BookIssueRow): BookIssue {
  const now = new Date();
  const dueDate = new Date(row.due_date);
  let status: BookIssueStatus = row.status;
  if (!row.returned_at && status === 'active' && now > dueDate) {
    status = 'overdue';
  }

  const authors = row.books?.book_authors?.flatMap((ba) => (ba.authors?.name ? [ba.authors.name] : [])) ?? [];
  const shelfLoc = Array.isArray(row.books?.shelf_locations)
    ? row.books.shelf_locations[0]
    : row.books?.shelf_locations;
  const location = shelfLoc
    ? {
        shelf: shelfLoc.shelf_code,
        row: shelfLoc.row_label,
        slot: shelfLoc.slot_label,
      }
    : undefined;

  return {
    id: row.id,
    bookId: row.book_id,
    memberId: row.member_id,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    returnedAt: row.returned_at,
    status,
    returnRequested: Boolean(row.return_requested),
    returnRequestedAt: row.return_requested_at ?? null,
    notes: row.notes ?? undefined,
    book: row.books
      ? {
          id: row.books.id,
          title: row.books.title,
          coverUrl: row.books.cover_url ?? undefined,
          authors,
          location,
        }
      : undefined,
    member: row.members
      ? {
          id: row.members.id,
          memberCode: row.members.member_code,
          fullName: row.members.full_name,
          email: row.members.email,
          phone: row.members.phone,
        }
      : undefined,
  };
}

export const bookIssueSelect = `
  id, book_id, member_id, issued_at, due_date, returned_at, status, return_requested, return_requested_at, notes,
  books (id, title, cover_url, book_authors (authors (name))),
  members (id, member_code, full_name, email, phone)
`;

export async function fetchBookIssues(): Promise<BookIssue[]> {
  const { data, error } = await supabase
    .from('book_issues')
    .select(bookIssueSelect)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as BookIssueRow[]).map(mapBookIssueRowToIssue);
}

export type { InventoryStatus };

/**
 * Dedicated lean inventory helper.
 * Concurrently fetches book total copies and active loan count to calculate real-time inventory.
 */
export async function getBookInventoryStatus(bookId: string): Promise<InventoryStatus> {
  // Fetch book total copies and count active loans concurrently
  const [bookRes, loanCountRes] = await Promise.all([
    supabase.from('books').select('copies').eq('id', bookId).single(),
    supabase.from('book_issues').select('id', { count: 'exact', head: true }).eq('book_id', bookId).is('returned_at', null),
  ]);

  if (bookRes.error || !bookRes.data) throw new Error('Book record not found');

  const totalCopies = Math.max(1, bookRes.data.copies ?? 1);
  const activeLoansCount = loanCountRes.count ?? 0;
  const availableCopies = Math.max(0, totalCopies - activeLoansCount);

  return {
    totalCopies,
    activeLoansCount,
    availableCopies,
    isAvailable: availableCopies > 0,
  };
}

export async function fetchSingleBookIssue(issueId: string): Promise<BookIssue | null> {
  const { data, error } = await supabase
    .from('book_issues')
    .select(bookIssueSelect)
    .eq('id', issueId)
    .maybeSingle();

  if (error || !data) return null;
  return mapBookIssueRowToIssue(data as unknown as BookIssueRow);
}

export async function createBookIssue(data: CreateIssueFormData): Promise<string> {
  // Strict Concurrency & Inventory Guard
  const inventory = await getBookInventoryStatus(data.bookId);
  if (inventory.availableCopies <= 0) {
    throw new Error(`Cannot issue book: All ${inventory.totalCopies} copy/copies are currently borrowed.`);
  }

  const insertPayload = {
    book_id: data.bookId,
    member_id: data.memberId,
    due_date: new Date(data.dueDate).toISOString(),
    status: 'active' as const,
    notes: data.notes?.trim() || null,
  };

  const { data: issue, error: issueError } = await supabase
    .from('book_issues')
    .insert(insertPayload)
    .select('id')
    .single();

  if (issueError) throw issueError;
  if (!issue || typeof issue.id !== 'string') {
    throw new Error('Supabase did not return the created issue ID.');
  }

  // After issuing: If availableCopies - 1 <= 0, mark 'issued', else keep 'available'
  const nextAvailability: BookAvailability = inventory.availableCopies - 1 <= 0 ? 'issued' : 'available';
  const { error: bookError } = await supabase
    .from('books')
    .update({ availability: nextAvailability })
    .eq('id', data.bookId);

  if (bookError) throw bookError;

  return issue.id;
}

export async function returnBookIssue(issueId: string, bookId: string): Promise<void> {
  const now = new Date().toISOString();

  const { error: issueError } = await supabase
    .from('book_issues')
    .update({
      returned_at: now,
      status: 'returned',
      return_requested: false,
    })
    .eq('id', issueId);

  if (issueError) throw issueError;

  // When returning, check if active loans become less than totalCopies. If so, ensure books.availability = 'available'.
  const inventory = await getBookInventoryStatus(bookId);
  if (inventory.availableCopies > 0) {
    const { error: bookError } = await supabase
      .from('books')
      .update({ availability: 'available' })
      .eq('id', bookId);

    if (bookError) throw bookError;
  }
}

/**
 * Returns an issued book given only its bookId.
 * Updates any active/overdue book_issues record and sets the book to 'available' if inventory allows.
 */
export async function returnBookByBookId(bookId: string): Promise<void> {
  const now = new Date().toISOString();

  // Find the latest active issue for this book (if one exists in book_issues)
  const { data: issues } = await supabase
    .from('book_issues')
    .select('id')
    .eq('book_id', bookId)
    .is('returned_at', null)
    .order('issued_at', { ascending: false })
    .limit(1);

  if (issues && issues.length > 0) {
    const issueId = (issues[0] as { id: string }).id;
    await supabase
      .from('book_issues')
      .update({
        returned_at: now,
        status: 'returned',
        return_requested: false,
      })
      .eq('id', issueId);
  }

  // When returning, check if active loans become less than totalCopies. If so, ensure books.availability = 'available'.
  const inventory = await getBookInventoryStatus(bookId);
  if (inventory.availableCopies > 0) {
    const { error: bookError } = await supabase
      .from('books')
      .update({ availability: 'available' })
      .eq('id', bookId);

    if (bookError) throw bookError;
  }
}

// ============================================================================
// PHASE 3: MEMBER SELF-REGISTRATION & BOOK REQUEST OPERATIONS
// ============================================================================

/**
 * Registers a new library member with an auto-generated member code.
 * Generates codes in the format MEM-XXXX where XXXX is a random 4-digit number.
 */
export async function registerMember(data: {
  fullName: string;
  email: string;
  phone?: string;
}): Promise<Member> {
  // Generate a unique member code with collision retry (max 5 attempts)
  let memberCode = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
    const candidate = `MEM-${suffix}`;
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('member_code', candidate)
      .maybeSingle();
    if (!existing) {
      memberCode = candidate;
      break;
    }
  }
  if (!memberCode) throw new Error('Could not generate a unique member code. Please try again.');

  const insertPayload = {
    member_code: memberCode,
    full_name: data.fullName.trim(),
    email: data.email.trim() || null,
    phone: data.phone?.trim() || null,
    status: 'active' as const,
  };

  const { data: member, error } = await supabase
    .from('members')
    .insert(insertPayload)
    .select('id, member_code, full_name, email, phone, status, created_at')
    .single();

  if (error) throw error;
  if (!member) throw new Error('Supabase did not return the registered member.');

  return {
    id: member.id,
    memberCode: member.member_code,
    fullName: member.full_name,
    email: member.email,
    phone: member.phone,
    status: member.status,
    createdAt: member.created_at,
    activeLoansCount: 0,
  };
}

/**
 * Looks up an existing member by email for quick login/identification.
 * Returns null if no member with that email exists.
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('id, member_code, full_name, email, phone, status, created_at, book_issues (id, status)')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapMemberRowToMember(data as unknown as MemberRow);
}

// DB row shape for book_requests joined queries
interface BookRequestRow {
  id: string;
  book_id: string;
  member_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  request_notes: string | null;
  created_at: string;
  updated_at: string;
  books?: {
    id: string;
    title: string;
    cover_url: string | null;
    availability: BookAvailability;
    copies?: number;
    book_authors?: Array<{ authors: { name: string } | null }>;
  } | null;
  members?: {
    id: string;
    member_code: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

function mapBookRequestRowToRequest(row: BookRequestRow): BookRequest {
  const bookAuthors =
    row.books?.book_authors?.flatMap((ba) =>
      ba.authors?.name ? [ba.authors.name] : []
    ) ?? [];

  return {
    id: row.id,
    bookId: row.book_id,
    memberId: row.member_id,
    status: row.status,
    requestNotes: row.request_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    book: row.books
      ? {
          id: row.books.id,
          title: row.books.title,
          coverUrl: row.books.cover_url ?? undefined,
          availability: row.books.availability,
          copies: row.books.copies ?? 1,
          authors: bookAuthors,
        }
      : undefined,
    member: row.members
      ? {
          id: row.members.id,
          memberCode: row.members.member_code,
          fullName: row.members.full_name,
          email: row.members.email,
          phone: row.members.phone,
        }
      : undefined,
  };
}

const bookRequestSelect = `
  id, book_id, member_id, status, request_notes, created_at, updated_at,
  books (id, title, cover_url, availability, copies, book_authors (authors (name))),
  members (id, member_code, full_name, email, phone)
`;

/**
 * Creates a new borrow request.
 * Guards: prevents requesting an already-issued book and duplicate pending requests.
 */
export async function createBookRequest(
  bookId: string,
  memberId: string,
  notes?: string,
): Promise<BookRequest> {
  // 1. Check real-time inventory
  const inventory = await getBookInventoryStatus(bookId);
  if (inventory.availableCopies <= 0) {
    throw new Error('This book is currently issued and unavailable for requests.');
  }

  // 2. Check for an existing pending request for this member + book
  const { data: existing, error: existingError } = await supabase
    .from('book_requests')
    .select('id')
    .eq('book_id', bookId)
    .eq('member_id', memberId)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    throw new Error('You already have a pending borrow request for this book.');
  }

  // 3. Insert the request
  const { data: request, error: insertError } = await supabase
    .from('book_requests')
    .insert({
      book_id: bookId,
      member_id: memberId,
      status: 'pending' as const,
      request_notes: notes?.trim() || null,
    })
    .select(bookRequestSelect)
    .single();

  if (insertError) throw insertError;
  if (!request) throw new Error('Supabase did not return the created request.');
  return mapBookRequestRowToRequest(request as unknown as BookRequestRow);
}

/**
 * Fetches book requests, optionally filtered by status. Sorted newest-first.
 */
export async function fetchBookRequests(status?: RequestStatus): Promise<BookRequest[]> {
  let query = supabase
    .from('book_requests')
    .select(bookRequestSelect)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as BookRequestRow[]).map(mapBookRequestRowToRequest);
}

/**
 * Approves a book request:
 * 1. Checks available inventory
 * 2. Creates a book_issues record via createBookIssue()
 * 3. Updates book_requests.status to 'approved'
 */
export async function approveBookRequest(
  requestId: string,
  bookId: string,
  memberId: string,
  dueDate: string,
): Promise<string> {
  const inventory = await getBookInventoryStatus(bookId);
  if (inventory.availableCopies <= 0) {
    throw new Error(`Cannot issue book: All ${inventory.totalCopies} copy/copies are currently borrowed.`);
  }

  const issueId = await createBookIssue({ bookId, memberId, dueDate });

  const { error } = await supabase
    .from('book_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

  if (error) throw error;

  return issueId;
}

/**
 * Rejects a book request — sets status to 'rejected'.
 */
export async function rejectBookRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('book_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) throw error;
}

export const memberActiveIssueSelect = `
  id, book_id, member_id, issued_at, due_date, returned_at, status, return_requested, return_requested_at, notes,
  books (
    id, title, cover_url,
    shelf_locations (shelf_code, row_label, slot_label),
    book_authors (authors (name))
  ),
  members (id, member_code, full_name, email, phone)
`;

/**
 * Fetches all currently active (unreturned) issues for a specific member,
 * joined with book metadata and shelf locations, with computed overdue status.
 */
export async function fetchMemberActiveIssues(memberId: string): Promise<BookIssue[]> {
  const { data, error } = await supabase
    .from('book_issues')
    .select(memberActiveIssueSelect)
    .eq('member_id', memberId)
    .is('returned_at', null)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as BookIssueRow[]).map(mapBookIssueRowToIssue);
}

/**
 * Fetches all book requests submitted by a specific member, sorted newest-first.
 */
export async function fetchMemberBookRequests(memberId: string): Promise<BookRequest[]> {
  const { data, error } = await supabase
    .from('book_requests')
    .select(bookRequestSelect)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as BookRequestRow[]).map(mapBookRequestRowToRequest);
}

/**
 * Cancels a pending book request by setting its status to 'cancelled'.
 * Guarded to only cancel requests that are currently 'pending'.
 */
export async function cancelBookRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('book_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Member action: requests return of an issued book.
 * Sets return_requested = true and timestamps it, placing the loan
 * in 'Return Pending Verification' until the librarian confirms receipt.
 */
export async function requestBookReturn(issueId: string): Promise<void> {
  const { error } = await supabase
    .from('book_issues')
    .update({
      return_requested: true,
      return_requested_at: new Date().toISOString(),
    })
    .eq('id', issueId);

  if (error) throw error;
}

// ============================================================================
// NOTIFICATION QUERIES (Phase 5)
// ============================================================================

interface RawNotificationRequestRow {
  id: string;
  created_at: string;
  books?: { title?: string | null } | null;
  members?: { full_name?: string | null; member_code?: string | null } | null;
}

interface RawNotificationIssueRow {
  id: string;
  return_requested_at?: string | null;
  books?: { title?: string | null } | null;
  members?: { full_name?: string | null; member_code?: string | null } | null;
}

/**
 * Fetches notification summary for librarians/admins:
 * - Pending borrow requests awaiting review
 * - Unreturned book issues with member return verification requested
 */
export async function fetchLibrarianNotificationSummary(): Promise<LibrarianNotificationSummary> {
  const [requestsRes, issuesRes] = await Promise.all([
    supabase
      .from('book_requests')
      .select('id, created_at, books (title), members (full_name, member_code)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('book_issues')
      .select('id, return_requested_at, books (title), members (full_name, member_code)')
      .eq('return_requested', true)
      .is('returned_at', null)
      .order('return_requested_at', { ascending: false }),
  ]);

  const borrowRequests = ((requestsRes.data ?? []) as unknown as RawNotificationRequestRow[]).map((row) => ({
    id: row.id,
    bookTitle: row.books?.title ?? 'Unknown Book',
    memberName: row.members?.full_name ?? 'Unknown Member',
    memberCode: row.members?.member_code ?? 'MEM',
    createdAt: row.created_at,
  }));

  const returnRequests = ((issuesRes.data ?? []) as unknown as RawNotificationIssueRow[]).map((row) => ({
    id: row.id,
    bookTitle: row.books?.title ?? 'Unknown Book',
    memberName: row.members?.full_name ?? 'Unknown Member',
    memberCode: row.members?.member_code ?? 'MEM',
    requestedAt: row.return_requested_at ?? new Date().toISOString(),
  }));

  return {
    totalCount: borrowRequests.length + returnRequests.length,
    borrowRequests,
    returnRequests,
  };
}

interface RawMemberRequestRow {
  id: string;
  status: RequestStatus;
  updated_at?: string | null;
  created_at: string;
  books?: { title?: string | null } | null;
}

interface RawMemberIssueRow {
  id: string;
  due_date: string;
  return_requested?: boolean;
  books?: { title?: string | null } | null;
}

/**
 * Fetches notification summary for an authenticated member:
 * - Decisions on their book requests (approved / rejected) in the last 7 days
 * - Due date warnings (<= 2 days) and overdue alerts on active loans
 */
export async function fetchMemberNotificationSummary(
  memberId: string,
): Promise<MemberNotificationSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [requestsRes, issuesRes] = await Promise.all([
    supabase
      .from('book_requests')
      .select('id, status, updated_at, created_at, books (title)')
      .eq('member_id', memberId)
      .in('status', ['approved', 'rejected'])
      .gte('created_at', sevenDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('book_issues')
      .select('id, due_date, return_requested, books (title)')
      .eq('member_id', memberId)
      .is('returned_at', null)
      .order('due_date', { ascending: true }),
  ]);

  const items: MemberNotificationItem[] = [];
  const now = new Date();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

  // Process loan due dates & overdue alerts
  for (const issue of (issuesRes.data ?? []) as unknown as RawMemberIssueRow[]) {
    const dueDate = new Date(issue.due_date);
    const bookTitle = issue.books?.title ?? 'Borrowed Book';
    const dueDateFormatted = dueDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    if (now > dueDate) {
      items.push({
        id: `loan-overdue-${issue.id}`,
        type: 'loan_overdue',
        title: 'Book Overdue',
        message: `Overdue: "${bookTitle}" was due on ${dueDateFormatted}. Please return it.`,
        timestamp: issue.due_date,
        bookTitle,
      });
    } else if (dueDate.getTime() - now.getTime() <= twoDaysMs) {
      items.push({
        id: `loan-due-soon-${issue.id}`,
        type: 'loan_due_soon',
        title: 'Return Due Soon',
        message: `Reminder: "${bookTitle}" is due on ${dueDateFormatted}.`,
        timestamp: issue.due_date,
        bookTitle,
      });
    }
  }

  // Process request decisions (approved / rejected)
  for (const req of (requestsRes.data ?? []) as unknown as RawMemberRequestRow[]) {
    const bookTitle = req.books?.title ?? 'Requested Book';
    const isApproved = req.status === 'approved';
    items.push({
      id: `req-${req.status}-${req.id}`,
      type: isApproved ? 'request_approved' : 'request_rejected',
      title: isApproved ? 'Request Approved' : 'Request Rejected',
      message: isApproved
        ? `Your request for "${bookTitle}" was approved! You can pick it up at the circulation desk.`
        : `Your request for "${bookTitle}" was not approved.`,
      timestamp: req.updated_at || req.created_at,
      bookTitle,
    });
  }

  // Sort items newest first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalCount: items.length,
    items,
  };
}


