'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, BookOpen, User, Calendar, FileText, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { createBookIssue, supabase, bookSelect, mapBookRowToBook, type BookRow, fetchMembers } from '@/app/lib/supabase';
import { cn } from '@/app/lib/utils';
import type { Book, Member, CreateIssueFormData } from '@/app/lib/types';

interface NewIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueCreated: () => Promise<void> | void;
}

function NewIssueModalContent({ onClose, onIssueCreated }: Omit<NewIssueModalProps, 'isOpen'>) {
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(true);

  // Form State
  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [notes, setNotes] = useState('');

  const [bookSearch, setBookSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch available books and active members on mount
  useEffect(() => {
    async function loadPrereqs() {
      try {
        const [booksRes, membersData] = await Promise.all([
          supabase.from('books').select(bookSelect).eq('availability', 'available').order('title', { ascending: true }),
          fetchMembers(),
        ]);

        if (booksRes.data) {
          const mapped = (booksRes.data as unknown as BookRow[]).map(mapBookRowToBook);
          setAvailableBooks(mapped);
          if (mapped.length > 0) setSelectedBookId(mapped[0].id);
        }

        const eligibleMembers = membersData.filter((m) => m.status === 'active');
        setActiveMembers(eligibleMembers);
        if (eligibleMembers.length > 0) setSelectedMemberId(eligibleMembers[0].id);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load library inventory.');
      } finally {
        setIsLoadingPrereqs(false);
      }
    }

    void loadPrereqs();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  const filteredBooks = useMemo(() => {
    const q = bookSearch.toLowerCase().trim();
    if (!q) return availableBooks;
    return availableBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)) ||
        (b.isbn?.toLowerCase().includes(q) ?? false),
    );
  }, [availableBooks, bookSearch]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return activeMembers;
    return activeMembers.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false),
    );
  }, [activeMembers, memberSearch]);

  const handlePresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedMemberId || !dueDate || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: CreateIssueFormData = {
        bookId: selectedBookId,
        memberId: selectedMemberId,
        dueDate,
        notes: notes.trim() || undefined,
      };

      await createBookIssue(payload);
      await onIssueCreated();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to issue the book.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBook = availableBooks.find((b) => b.id === selectedBookId);
  const selectedMember = activeMembers.find((m) => m.id === selectedMemberId);

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="issue-modal-title"
    >
      <div
        className={cn(
          'w-full md:max-w-lg bg-white dark:bg-slate-800 shadow-2xl flex flex-col',
          'rounded-t-2xl md:rounded-2xl',
          'max-h-[92dvh] md:max-h-[90dvh]',
        )}
      >
        {/* Grab handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 id="issue-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Issue Book to Patron
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an available title from inventory and assign it to an active member.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            disabled={isSubmitting}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isLoadingPrereqs ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <LoaderCircle className="w-8 h-8 animate-spin text-violet-500 mb-3" />
            <span className="text-sm font-medium">Loading catalog and members…</span>
          </div>
        ) : (
          <form id="issue-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5 flex-1" noValidate>
            {errorMsg && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            {/* Book Selection */}
            <div>
              <label htmlFor="book-select" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Select Available Book <span className="text-red-500">*</span>
              </label>
              {availableBooks.length === 0 ? (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                  No books are currently available for issue. Check back after books are returned or add new titles.
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="search"
                    placeholder="Filter available titles…"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-slate-100 dark:bg-slate-700 border border-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <select
                    id="book-select"
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 transition-all"
                  >
                    {filteredBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.authors.slice(0, 1).join(', ') || 'Unknown'}) · Shelf {b.location.shelf}
                      </option>
                    ))}
                  </select>
                  {selectedBook && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-xs">
                      <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      <div className="truncate flex-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedBook.title}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1">({selectedBook.language}, {selectedBook.publishedYear})</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Member Selection */}
            <div>
              <label htmlFor="member-select" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Borrowing Member <span className="text-red-500">*</span>
              </label>
              {activeMembers.length === 0 ? (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                  No active members found. Please register a member first in the Members section.
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="search"
                    placeholder="Filter active members…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-slate-100 dark:bg-slate-700 border border-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <select
                    id="member-select"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 transition-all"
                  >
                    {filteredMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.memberCode}) {m.email ? `· ${m.email}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedMember && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-xs">
                      <User className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      <div className="truncate flex-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedMember.fullName}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1">({selectedMember.memberCode})</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Return Due Date + Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="due-date" className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Return Due Date <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePresetDays(7)}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-200 dark:bg-slate-700 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    +7d
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(14)}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-200 dark:bg-slate-700 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    +14d
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(30)}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-200 dark:bg-slate-700 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    +30d
                  </button>
                </div>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="due-date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 transition-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="issue-notes" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <textarea
                  id="issue-notes"
                  rows={2}
                  placeholder="e.g. Reference copy requested for semester project"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all resize-none"
                />
              </div>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="submit"
            form="issue-form"
            id="confirm-issue-btn"
            disabled={!selectedBookId || !selectedMemberId || !dueDate || isSubmitting || availableBooks.length === 0 || activeMembers.length === 0}
            className="flex-1 py-2.5 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Recording Loan…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirm &amp; Issue Book
              </span>
            )}
          </button>
          <button
            type="button"
            id="cancel-issue-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewIssueModal(props: NewIssueModalProps) {
  if (!props.isOpen) return null;
  return <NewIssueModalContent {...props} />;
}
