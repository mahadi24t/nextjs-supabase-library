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

