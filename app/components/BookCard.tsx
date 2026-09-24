'use client';

import { MapPin, BookOpen, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/app/lib/utils';
import type { Book } from '@/app/lib/types';

interface BookCardProps {
  book: Book;
  onIssue: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
}

const GENRE_COLORS: Record<string, string> = {
  'Sci-Fi': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  History: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Fiction: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Poetry: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Non-Fiction': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Biography: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Philosophy: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Drama: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] ?? GENRE_COLORS.Default;
}

export default function BookCard({ book, onIssue, onEdit, onDelete }: BookCardProps) {
  const { title, authors, genres, location, availability, coverUrl, publishedYear, language } = book;

  return (
    <article
      className="group relative flex flex-col rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
      aria-label={`Book: ${title}`}
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`Cover of ${title}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-slate-400">
            <BookOpen className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-xs text-center font-medium line-clamp-3 opacity-70">{title}</span>
          </div>
        )}

        {/* Availability pill — overlaid on cover */}
        <div className="absolute top-2 left-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm border',
              availability === 'available'
                ? 'bg-emerald-100/90 text-emerald-700 border-emerald-200 dark:bg-emerald-900/70 dark:text-emerald-300 dark:border-emerald-700'
                : 'bg-amber-100/90 text-amber-700 border-amber-200 dark:bg-amber-900/70 dark:text-amber-300 dark:border-amber-700'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                availability === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
              )}
              aria-hidden="true"
            />
            {availability === 'available' ? 'Available' : 'Issued'}
          </span>
        </div>

        {/* Quick actions — visible on hover */}
        <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2 bg-gradient-to-t from-black/70 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            id={`issue-book-${book.id}`}
            onClick={() => onIssue(book)}
            aria-label={`Issue "${title}"`}
            className="flex-1 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white min-h-[36px]"
          >
            Issue
          </button>
          <button
            id={`edit-book-${book.id}`}
            onClick={() => onEdit(book)}
            aria-label={`Edit "${title}"`}
            className="flex items-center justify-center w-9 h-9 bg-white/20 hover:bg-white/30 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            id={`delete-book-${book.id}`}
            onClick={() => onDelete(book.id)}
            aria-label={`Delete "${title}"`}
            className="flex items-center justify-center w-9 h-9 bg-white/20 hover:bg-red-500/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-2 p-3">
        {/* Title */}
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2" title={title}>
          {title}
        </h3>

        {/* Authors */}
        <div className="flex flex-wrap gap-1">
          {authors.slice(0, 2).map((author) => (
            <span
              key={author}
              className="text-[11px] text-violet-600 dark:text-violet-400 font-medium"
            >
              {author}
            </span>
          ))}
          {authors.length > 2 && (
            <span className="text-[11px] text-slate-400">+{authors.length - 2}</span>
          )}
        </div>

        {/* Genre Chips */}
        <div className="flex flex-wrap gap-1">
          {genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className={cn(
                'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium',
                getGenreColor(genre)
              )}
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Shelf Location */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-auto">
          <MapPin className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">
            Shelf {location.shelf} · Row {location.row} · Slot {location.slot}
          </span>
        </div>

        {/* Footer: year + language */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
          <span>{publishedYear}</span>
          <span className="font-medium uppercase tracking-wide">{language.slice(0, 2)}</span>
        </div>
      </div>
    </article>
  );
}
