'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Ban,
  LogOut,
  RefreshCw,
  MapPin,
  Calendar,
  Mail,
  Phone,
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
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (!currentMember?.id) return;
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
        setRefreshing(false);
      }
    },
    [currentMember?.id],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleLogout = () => {
    logoutMember();
    onClose();
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingId(requestId);
    setCancelError(null);
    try {
      await cancelBookRequest(requestId);
      // Immediately reflect status update in UI
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
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
      aria-labelledby="member-dashboard-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#181920] rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header Profile Section */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-b from-slate-100/90 to-transparent dark:from-neutral-900/90 dark:to-transparent border-b border-slate-200 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Member Initial Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-violet-600/30 ring-2 ring-violet-500/20 shrink-0 select-none">
                {currentMember?.fullName?.charAt(0).toUpperCase() || 'M'}
              </div>

              {/* Member Details */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="member-dashboard-title"
                    className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate"
                  >
                    {currentMember?.fullName || 'Member Profile'}
                  </h2>
                  {currentMember?.memberCode && (
                    <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300">
                      {currentMember.memberCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  {currentMember?.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{currentMember.email}</span>
                    </span>
                  )}
                  {currentMember?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{currentMember.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions (Refresh, Logout, Close) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => loadData(true)}
                disabled={loading || refreshing}
                title="Refresh library activity"
                aria-label="Refresh library activity"
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-violet-500')} />
              </button>

              <button
                onClick={handleLogout}
                title="Log out of member account"
                aria-label="Log out of member account"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => setActiveTab('borrowed')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                activeTab === 'borrowed'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'bg-slate-200/70 hover:bg-slate-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>Currently Borrowed</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  activeTab === 'borrowed'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-300 dark:bg-neutral-700 text-slate-700 dark:text-slate-300',
                )}
              >
                {activeIssues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                activeTab === 'requests'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'bg-slate-200/70 hover:bg-slate-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
              )}
            >
              <Clock className="w-4 h-4" />
              <span>My Requests</span>
              {pendingRequestsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                  {pendingRequestsCount}
                </span>
              ) : (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    activeTab === 'requests'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-300 dark:bg-neutral-700 text-slate-700 dark:text-slate-300',
                  )}
                >
                  {requests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => loadData(true)}
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

          {/* Loading Skeletons */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/50 animate-pulse"
                >
                  <div className="w-14 h-20 rounded bg-slate-300 dark:bg-neutral-800 shrink-0" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-4 bg-slate-300 dark:bg-neutral-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'borrowed' ? (
            /* TAB 1: CURRENTLY BORROWED */
            activeIssues.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-900/60 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3.5 shadow-sm">
                  <BookMarked className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No books currently borrowed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
                  You do not have any active loans right now. Browse our catalog to find books you
                  would like to read and submit a borrow request!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeIssues.map((issue) => {
                  const dueInfo = calculateDueStatus(issue.dueDate);
                  return (
                    <div
                      key={issue.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50 hover:border-violet-300 dark:hover:border-neutral-700 transition-all shadow-sm group"
                    >
                      {/* Left: Book Cover + Details */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-14 h-20 rounded bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm relative">
                          {issue.book?.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={issue.book.coverUrl}
                              alt={issue.book.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <BookOpen className="w-5 h-5 text-violet-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-1">
                            {issue.book?.title ?? 'Untitled Book'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {issue.book?.authors?.join(', ') || 'Unknown Author'}
                          </p>

                          {/* Shelf Location if available */}
                          {issue.book?.location && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                              <MapPin className="w-3 h-3 text-violet-500 shrink-0" />
                              <span>
                                Shelf {issue.book.location.shelf} · Row {issue.book.location.row} ·
                                Slot {issue.book.location.slot}
                              </span>
                            </div>
                          )}

                          {/* Dates row */}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Issued: {formatDate(issue.issuedAt)}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Due: {formatDate(issue.dueDate)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Overdue / Due Status Warning Badge */}
                      <div className="sm:self-center shrink-0">
                        {dueInfo.isOverdue ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{dueInfo.label}</span>
                          </div>
                        ) : dueInfo.isDueToday ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{dueInfo.label}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
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
                <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-900/60 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3.5 shadow-sm">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No book requests found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
                  You haven&apos;t submitted any book borrow requests yet. Open any available book in
                  the catalog to request it from the librarian.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50 hover:border-violet-300 dark:hover:border-neutral-700 transition-all shadow-sm group"
                  >
                    {/* Left: Book info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-16 rounded bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm">
                        {req.book?.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={req.book.coverUrl}
                            alt={req.book.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-4 h-4 text-violet-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-1">
                          {req.book?.title ?? 'Untitled Book'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {req.book?.authors?.join(', ') || 'Unknown Author'}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Requested on {formatDate(req.createdAt)}</span>
                        </div>

                        {req.requestNotes && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 italic truncate mt-1">
                            Note: &ldquo;{req.requestNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Status badge & Cancel action */}
                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Under Review</span>
                        </span>
                      )}

                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved &amp; Issued</span>
                        </span>
                      )}

                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Declined</span>
                        </span>
                      )}

                      {req.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancelled</span>
                        </span>
                      )}

                      {/* Cancel Action Button (only if pending) */}
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={cancellingId === req.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 border border-slate-200 dark:border-neutral-800 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
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
