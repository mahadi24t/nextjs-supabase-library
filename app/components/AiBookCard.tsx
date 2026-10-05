'use client';

import { useState, useEffect } from 'react';
import { BookOpen, MapPin, CheckCircle2, AlertCircle, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { fetchBookById, getBookInventoryStatus, type InventoryStatus } from '@/app/lib/supabase';
import type { Book } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';

interface AiBookCardProps {
  bookId: string;
  onSelectBook: (bookId: string) => void;
}

export default function AiBookCard({ bookId, onSelectBook }: AiBookCardProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [inventory, setInventory] = useState<InventoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBookData() {
      try {
        const [bookData, invData] = await Promise.all([
          fetchBookById(bookId),
          getBookInventoryStatus(bookId).catch(() => null),
        ]);

        if (!isMounted) return;
        setBook(bookData);
        setInventory(invData);
      } catch (err) {
        console.error('Failed to load book for AI card:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadBookData();

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  if (loading) {
    return (
      <div className="my-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center gap-3 animate-pulse">
        <div className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!book) return null;

  const totalCopies = inventory ? inventory.totalCopies : book.copies;
  const availableCopies = inventory ? inventory.availableCopies : (book.availability === 'available' ? totalCopies : 0);
  const isAvailable = availableCopies > 0;
  const shelfCode = book.location?.shelf || 'A1';

  return (
    <div
      onClick={() => onSelectBook(book.id)}
      className="my-3 overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-900/40 bg-gradient-to-br from-white to-violet-50/40 dark:from-slate-900 dark:to-violet-950/20 p-3 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group select-none text-left"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectBook(book.id);
        }
      }}
      aria-label={`View book details for ${book.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Cover thumbnail */}
        <div className="w-12 h-16 rounded-lg bg-slate-900 shrink-0 overflow-hidden relative shadow-sm border border-slate-200/80 dark:border-slate-800">
          {book.coverUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={book.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-800 text-white p-1">
              <BookOpen className="w-5 h-5 text-violet-200" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors"
              title={book.title}
            >
              {book.title}
            </h4>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors shrink-0" />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {book.authors.join(', ') || 'Unknown Author'}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {/* Shelf Code */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <MapPin className="w-2.5 h-2.5 text-slate-400" />
              Shelf: {shelfCode}
            </span>

            {/* Stock Badge */}
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                In Shelf ({availableCopies}/{totalCopies})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                <AlertCircle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                On Loan (0/{totalCopies})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
        <span className="text-violet-600 dark:text-violet-400 font-semibold group-hover:underline flex items-center gap-1">
          <span>বইটি দেখুন / ধার নিন</span>
          <span aria-hidden="true">&rarr;</span>
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
          {book.language || 'Bangla'}
        </span>
      </div>
    </div>
  );
}
