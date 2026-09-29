import { createClient } from '@supabase/supabase-js';
import type { AddBookFormData, Book, BookAvailability, ShelfLocation } from '@/app/lib/types';

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
    original_language: data.isTranslated ? data.originalLanguage.trim() || null : null,
    copies: data.copies,
    published_year: data.publishedYear,
    cover_url: data.coverUrl.trim() || null,
    availability: 'available' as const,
    // AddBookFormData has no isbn field; preserve null until the form adds one.
    isbn: null,
  };
}

export function toShelfLocationInsert(data: AddBookFormData) {
  return {
    shelf_code: data.shelf.trim() || '?',
    row_label: data.row.trim() || '?',
    slot_label: data.slot.trim() || '?',
  };
}
