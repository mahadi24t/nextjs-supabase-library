'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Ban,
  Calendar,
  MapPin,
  LoaderCircle,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import { useMemberAuth } from '@/app/context/MemberAuthContext';
import {
  fetchMemberActiveIssues,
  fetchMemberBookRequests,
  cancelBookRequest,
} from '@/app/lib/supabase';
import { cn } from '@/app/lib/utils';
import type { BookIssue, BookRequest } from '@/app/lib/types';

interface MemberDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'borrowed' | 'requests';

function calculateDueStatus(dueDateStr: string) {
  const now = new Date();
  const due = new Date(dueDateStr);
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffTime = dueDateOnly.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`,
      isOverdue: true,
      diffDays,
    };
  } else if (diffDays === 0) {
    return {
      label: 'Due today',
      isDueToday: true,
      diffDays: 0,
    };
  } else {
    return {
      label: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} remaining`,
      isSafe: true,
      diffDays,
    };
  }
}

function formatDate(isoDate: string) {
  try {
    return new Date(isoDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function MemberDashboardModalContent({ onClose }: { onClose: () => void }) {
  const { currentMember, logoutMember } = useMemberAuth();
  const [activeTab, setActiveTab] = useState<Tab>('borrowed');

  const [activeIssues, setActiveIssues] = useState<BookIssue[]>([]);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentMember?.id) return;
    setLoading(true);
    setErrorMsg(null);
    setCancelError(null);

    try {
      const [issuesData, requestsData] = await Promise.all([
        fetchMemberActiveIssues(currentMember.id),
        fetchMemberBookRequests(currentMember.id),
      ]);
      setActiveIssues(issuesData);
      setRequests(requestsData);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to load personal library activity. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [currentMember?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close on Escape key press anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleLogout = () => {
    logoutMember();
    onClose();
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingId(requestId);
    setCancelError(null);
    try {
      await cancelBookRequest(requestId);
      setRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, status: 'cancelled' } : req)),
      );
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : 'Could not cancel request. Please try again.',
      );
    } finally {
      setCancellingId(null);
    }
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="member-dashboard-title"
    >
      <div
        className="bg-white dark:bg-[#181920] border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title, Member Code, and Close Button */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold">
              {currentMember?.fullName?.charAt(0) || 'M'}
            </div>
            <div>
              <h2
                id="member-dashboard-title"
                className="text-base font-bold text-neutral-900 dark:text-white leading-tight"
              >
                {currentMember?.fullName}
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                {currentMember?.memberCode} • {currentMember?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
            >
              Logout
            </button>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs Row: "Currently Borrowed" & "My Requests" */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-5 pt-2 gap-4 bg-neutral-50/50 dark:bg-neutral-900/30 shrink-0">
          <button
            onClick={() => setActiveTab('borrowed')}
            className={cn(
              'flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer focus-visible:outline-none',
              activeTab === 'borrowed'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200',
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>Currently Borrowed</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === 'borrowed'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
              )}
            >
              {activeIssues.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              'flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer focus-visible:outline-none',
              activeTab === 'requests'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200',
            )}
          >
            <Clock className="w-4 h-4" />
            <span>My Requests</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                pendingRequestsCount > 0
                  ? 'bg-amber-500 text-white'
                  : activeTab === 'requests'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
              )}
            >
              {requests.length}
            </span>
          </button>
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => loadData()}
                className="font-semibold underline hover:no-underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {cancelError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 animate-pulse"
                >
                  <div className="w-12 h-16 rounded bg-neutral-300 dark:bg-neutral-800 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-neutral-300 dark:bg-neutral-800 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'borrowed' ? (
            /* TAB 1: CURRENTLY BORROWED */
            activeIssues.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 shadow-sm">
                  <BookMarked className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  No books currently borrowed
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mt-1 leading-relaxed">
                  You have no active loans right now. Request a book from the catalog to borrow it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeIssues.map((issue) => {
                  const dueInfo = calculateDueStatus(issue.dueDate);
                  return (
                    <div
                      key={issue.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 hover:border-purple-300 dark:hover:border-neutral-700 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-16 rounded bg-neutral-900 shrink-0 overflow-hidden flex items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                          {issue.book?.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={issue.book.coverUrl}
                              alt={issue.book.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="w-4 h-4 text-purple-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm leading-snug line-clamp-1">
                            {issue.book?.title ?? 'Untitled Book'}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {issue.book?.authors?.join(', ') || 'Unknown Author'}
                          </p>

                          {issue.book?.location && (
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1 font-mono">
                              <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                              <span>
                                Shelf {issue.book.location.shelf} · Row {issue.book.location.row} ·
                                Slot {issue.book.location.slot}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-neutral-400" />
                              <span>Issued: {formatDate(issue.issuedAt)}</span>
                            </span>
                            <span className="text-neutral-300 dark:text-neutral-700">•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>Due: {formatDate(issue.dueDate)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="sm:self-center shrink-0">
                        {dueInfo.isOverdue ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{dueInfo.label}</span>
                          </div>
                        ) : dueInfo.isDueToday ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{dueInfo.label}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{dueInfo.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 2: MY REQUESTS */
            requests.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  No book requests found
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mt-1 leading-relaxed">
                  You haven&apos;t requested any books yet. Browse the catalog to submit a request.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 hover:border-purple-300 dark:hover:border-neutral-700 transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-16 rounded bg-neutral-900 shrink-0 overflow-hidden flex items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm">
                        {req.book?.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={req.book.coverUrl}
                            alt={req.book.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-4 h-4 text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm leading-snug line-clamp-1">
                          {req.book?.title ?? 'Untitled Book'}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {req.book?.authors?.join(', ') || 'Unknown Author'}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-neutral-500">
                          <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span>Requested on {formatDate(req.createdAt)}</span>
                        </div>

                        {req.requestNotes && (
                          <p className="text-[11px] text-neutral-400 italic truncate mt-1">
                            Note: &ldquo;{req.requestNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Under Review</span>
                        </span>
                      )}

                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved &amp; Issued</span>
                        </span>
                      )}

                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Declined</span>
                        </span>
                      )}

                      {req.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-500/15 text-neutral-500 dark:text-neutral-400 border border-neutral-500/30">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancelled</span>
                        </span>
                      )}

                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={cancellingId === req.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-800 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 cursor-pointer"
                        >
                          {cancellingId === req.id ? (
                            <>
                              <LoaderCircle className="w-3 h-3 animate-spin" />
                              <span>Cancelling…</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" />
                              <span>Cancel Request</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function MemberDashboardModal({ isOpen, onClose }: MemberDashboardModalProps) {
  if (!isOpen) return null;
  return <MemberDashboardModalContent onClose={onClose} />;
}
