'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Plus,
  LoaderCircle,
  AlertCircle,
  History,
  Lock,
} from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import NewIssueModal from '@/app/components/NewIssueModal';
import { useAuth } from '@/app/context/AuthContext';
import { fetchBookIssues, returnBookIssue } from '@/app/lib/supabase';
import { cn } from '@/app/lib/utils';
import type { BookIssue } from '@/app/lib/types';

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${accent}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

export default function IssueReturnPage() {
  const { isAdmin, openLoginModal } = useAuth();
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [newIssueModalOpen, setNewIssueModalOpen] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchBookIssues();
      setIssues(data);
      setErrorMsg(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load circulation records.';
      setErrorMsg(
        msg.includes('relation "public.book_issues" does not exist')
          ? 'The "book_issues" table was not found in Supabase. Please run the SQL migration in supabase/schema.sql.'
          : msg,
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitial() {
      try {
        const data = await fetchBookIssues();
        if (!isMounted) return;
        setIssues(data);
        setErrorMsg(null);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load circulation records.';
        setErrorMsg(
          msg.includes('relation "public.book_issues" does not exist')
            ? 'The "book_issues" table was not found in Supabase. Please run the SQL migration in supabase/schema.sql.'
            : msg,
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeIssues = useMemo(() => {
    return issues.filter((i) => i.status === 'active' || i.status === 'overdue');
  }, [issues]);

  const historyIssues = useMemo(() => {
    return issues.filter((i) => i.status === 'returned');
  }, [issues]);

  const stats = useMemo(() => {
    const active = activeIssues.filter((i) => i.status === 'active').length;
    const overdue = activeIssues.filter((i) => i.status === 'overdue').length;
    const returned = historyIssues.length;
    return {
      active,
      overdue,
      returned,
      total: issues.length,
    };
  }, [activeIssues, historyIssues, issues.length]);

  const filteredItems = useMemo(() => {
    const list = activeTab === 'active' ? activeIssues : historyIssues;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((i) => {
      const bookTitle = i.book?.title.toLowerCase() ?? '';
      const borrowerName = i.member?.fullName.toLowerCase() ?? '';
      const memberCode = i.member?.memberCode.toLowerCase() ?? '';
      const notes = i.notes?.toLowerCase() ?? '';
      return (
        bookTitle.includes(q) ||
        borrowerName.includes(q) ||
        memberCode.includes(q) ||
        notes.includes(q)
      );
    });
  }, [activeIssues, activeTab, historyIssues, searchQuery]);

  const handleReturn = async (issue: BookIssue) => {
    if (!confirm(`Mark "${issue.book?.title ?? 'this book'}" as returned from ${issue.member?.fullName ?? 'patron'}?`)) {
      return;
    }

    setReturningId(issue.id);
    try {
      await returnBookIssue(issue.id, issue.bookId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark book as returned.');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <AppLayout
      title="Circulation: Issue & Return"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search by book title, borrower, member ID…"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Circulation Desk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track active book loans, process returns, and inspect borrower circulation history.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setNewIssueModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Issue Book
          </button>
        )}
      </div>

      {/* Guest Restricted Access Lock Banner */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold">Restricted Access</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Please log in as Librarian to manage circulation and patrons.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLoginModal('Please log in as Librarian to manage circulation and patrons.')}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            Librarian Login
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Loans" value={stats.active} icon={BookOpen} accent="bg-violet-500" />
        <StatCard label="Overdue Returns" value={stats.overdue} icon={AlertTriangle} accent="bg-rose-500" />
        <StatCard label="Returned (History)" value={stats.returned} icon={CheckCircle2} accent="bg-emerald-500" />
        <StatCard label="Total Transactions" value={stats.total} icon={ArrowLeftRight} accent="bg-blue-500" />
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all',
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Clock className="w-4 h-4" />
            Active Loans ({activeIssues.length})
            {stats.overdue > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all',
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <History className="w-4 h-4" />
            Return History ({historyIssues.length})
          </button>
        </div>

        {/* Mobile Search input */}
        <div className="md:hidden w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search loans…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load circulation records</p>
            <p className="text-xs mt-0.5 opacity-90">{errorMsg}</p>
          </div>
          <button
            onClick={() => void loadData()}
            className="px-3 py-1 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 rounded-md font-medium text-xs transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table / List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <LoaderCircle className="w-8 h-8 animate-spin text-violet-500 mb-3" />
          <span className="text-sm font-medium">Fetching circulation desk records…</span>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Book Title</th>
                  <th className="px-4 py-3.5">Borrower</th>
                  <th className="px-4 py-3.5">Issued Date</th>
                  <th className="px-4 py-3.5">{activeTab === 'active' ? 'Due Date' : 'Returned On'}</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredItems.map((issue) => {
                  const isOverdue = issue.status === 'overdue';
                  const isReturned = issue.status === 'returned';
                  const dueDateObj = new Date(issue.dueDate);
                  const returnedDateObj = issue.returnedAt ? new Date(issue.returnedAt) : null;

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                      {/* Book Title & Cover */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 rounded bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                            {issue.book?.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={issue.book.coverUrl}
                                alt={issue.book.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-violet-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                              {issue.book?.title ?? 'Unknown Book'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {issue.book?.authors.join(', ') || 'Unknown Author'}
                            </div>
                            {issue.notes && (
                              <div className="text-[11px] text-slate-400 italic truncate mt-0.5">
                                Note: {issue.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Borrower */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center text-xs shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {issue.member?.fullName ?? 'Unknown Patron'}
                            </div>
                            <div className="font-mono text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                              {issue.member?.memberCode ?? 'MEM'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Issued Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(issue.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>

                      {/* Due Date or Return Date */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        {isReturned && returnedDateObj ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{returnedDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          <div className={cn('flex items-center gap-1.5 font-medium', isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300')}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                            isReturned
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300'
                              : isOverdue
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isReturned ? 'bg-slate-500' : isOverdue ? 'bg-rose-500' : 'bg-emerald-500',
                            )}
                          />
                          {issue.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {!isAdmin ? (
                          <span className="text-xs text-slate-400 italic">Read-only</span>
                        ) : activeTab === 'active' ? (
                          <button
                            onClick={() => void handleReturn(issue)}
                            disabled={returningId === issue.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 shadow-sm"
                          >
                            {returningId === issue.id ? (
                              <>
                                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                Processing…
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                Mark Returned
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {activeTab === 'active' ? 'No active book loans' : 'No return history records'}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            {activeTab === 'active'
              ? 'All books are safely returned and available on shelves.'
              : 'Completed returns and archival records will appear here.'}
          </p>
        </div>
      )}

      {/* Mobile FAB */}
      {isAdmin && (
        <button
          onClick={() => setNewIssueModalOpen(true)}
          aria-label="Issue Book"
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-full shadow-lg shadow-violet-600/40 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* New Issue Modal */}
      <NewIssueModal
        isOpen={newIssueModalOpen}
        onClose={() => setNewIssueModalOpen(false)}
        onIssueCreated={loadData}
      />
    </AppLayout>
  );
}
