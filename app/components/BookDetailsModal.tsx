'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  BookOpen,
  Globe,
  Languages,
  Hash,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  LogIn,
  Send,
  LogOut,
} from 'lucide-react';
import { createBookRequest } from '@/app/lib/supabase';
import { useMemberAuth } from '@/app/context/MemberAuthContext';
import MemberAuthModal from '@/app/components/MemberAuthModal';
import { cn } from '@/app/lib/utils';
import type { Book } from '@/app/lib/types';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

function BookDetailsModalContent({ book, onClose }: Omit<BookDetailsModalProps, 'isOpen' | 'book'> & { book: Book }) {
  const { currentMember, isMemberLoggedIn, logout } = useMemberAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !authModalOpen) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, authModalOpen]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current && !authModalOpen) onClose();
    },
    [onClose, authModalOpen],
  );

  const handleRequestBorrow = async () => {
    if (!isMemberLoggedIn || !currentMember) {
      setAuthModalOpen(true);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createBookRequest(book.id, currentMember.id, requestNotes || undefined);
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAvailable = book.availability === 'available';
  const cleanCoverUrl = book.coverUrl?.trim() || null;

  return (
    <>
      <div
        ref={overlayRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/65 backdrop-blur-sm p-0 md:p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby="book-details-title"
      >
        <div
          className={cn(
            'w-full md:max-w-lg bg-white dark:bg-slate-800 shadow-2xl flex flex-col',
            'rounded-t-2xl md:rounded-2xl border-t border-slate-200 dark:border-slate-700 md:border',
            'max-h-[95dvh] md:max-h-[90dvh]',
          )}
        >
          {/* Grab handle */}
          <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Hero: Cover + title block */}
            <div className="relative">
              {cleanCoverUrl ? (
                <div className="h-44 md:h-56 w-full bg-slate-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cleanCoverUrl}
                    alt={`Cover of ${book.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>
              ) : (
                <div className="h-36 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close book details"
                className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Availability badge */}
              <div className="absolute top-3 left-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border',
                    isAvailable
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40',
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', isAvailable ? 'bg-emerald-400' : 'bg-amber-400')} />
                  {isAvailable ? 'Available' : 'Currently Issued'}
                </span>
              </div>

              {/* Title overlay on cover */}
              {cleanCoverUrl && (
                <div className="absolute bottom-3 left-4 right-4">
                  <h2 id="book-details-title" className="text-xl font-bold text-white leading-snug line-clamp-2 drop-shadow">
                    {book.title}
                  </h2>
                  {book.subtitle && (
                    <p className="text-sm text-white/70 mt-0.5 line-clamp-1">{book.subtitle}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pt-4 pb-2 space-y-4">
              {/* Title (when no cover) */}
              {!cleanCoverUrl && (
                <div>
                  <h2 id="book-details-title" className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {book.title}
                  </h2>
                  {book.subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{book.subtitle}</p>
                  )}
                </div>
              )}

              {/* Authors */}
              <div className="flex flex-wrap gap-1.5">
                {book.authors.map((author) => (
                  <span key={author} className="text-sm text-violet-600 dark:text-violet-400 font-semibold">
                    {author}
                  </span>
                ))}
              </div>

              {/* Genre chips */}
              <div className="flex flex-wrap gap-1.5">
                {book.genres.map((genre) => (
                  <span
                    key={genre}
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-2">
                <MetaItem icon={<Calendar className="w-3.5 h-3.5" />} label="Published" value={String(book.publishedYear)} />
                <MetaItem icon={<Globe className="w-3.5 h-3.5" />} label="Language" value={book.language} />
                <MetaItem
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label="Shelf Location"
                  value={`Shelf ${book.location.shelf} · Row ${book.location.row} · Slot ${book.location.slot}`}
                />
                <MetaItem icon={<BookOpen className="w-3.5 h-3.5" />} label="Copies" value={String(book.copies)} />
                {book.isbn && (
                  <MetaItem icon={<Hash className="w-3.5 h-3.5" />} label="ISBN" value={book.isbn} className="col-span-2" />
                )}
                {book.isTranslated && book.originalLanguage && (
                  <MetaItem
                    icon={<Languages className="w-3.5 h-3.5" />}
                    label="Translated from"
                    value={book.originalLanguage}
                    className="col-span-2"
                  />
                )}
              </div>

              {/* Member session badge */}
              {isMemberLoggedIn && currentMember && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {currentMember.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-violet-900 dark:text-violet-200 truncate">
                        {currentMember.fullName}
                      </p>
                      <p className="text-[11px] font-mono text-violet-600 dark:text-violet-400">
                        {currentMember.memberCode}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign out"
                    aria-label="Sign out of member session"
                    className="p-1.5 rounded-lg text-violet-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Notes textarea (only shown if logged in & available & not yet submitted) */}
              {isMemberLoggedIn && isAvailable && !submitSuccess && (
                <div>
                  <label htmlFor="borrow-notes" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Notes for Librarian <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="borrow-notes"
                    rows={2}
                    placeholder="e.g. Needed for research project, preferred pickup time…"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700/70 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all resize-none"
                  />
                </div>
              )}

              {/* Error */}
              {submitError && (
                <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Success */}
              {submitSuccess && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                      Request submitted!
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      A librarian will review your request and issue the book shortly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
            {submitSuccess ? (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              >
                Done
              </button>
            ) : !isAvailable ? (
              <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Book is currently on loan — check back later
              </div>
            ) : isMemberLoggedIn ? (
              <button
                id="submit-borrow-request-btn"
                onClick={() => void handleRequestBorrow()}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[44px] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Request to Borrow
                  </>
                )}
              </button>
            ) : (
              <button
                id="member-login-to-borrow-btn"
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[44px] flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Request
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Member Auth sub-modal */}
      <MemberAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          // After login, submit the request automatically
          void handleRequestBorrow();
        }}
      />
    </>
  );
}

function MetaItem({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700', className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{value}</p>
    </div>
  );
}

export default function BookDetailsModal({ isOpen, book, onClose }: BookDetailsModalProps) {
  if (!isOpen || !book) return null;
  return <BookDetailsModalContent book={book} onClose={onClose} />;
}
