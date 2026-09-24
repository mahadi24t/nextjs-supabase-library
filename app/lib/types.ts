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
