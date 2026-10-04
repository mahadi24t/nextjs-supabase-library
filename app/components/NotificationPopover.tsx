'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { LibrarianNotificationSummary, MemberNotificationSummary } from '@/app/lib/types';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isMemberLoggedIn: boolean;
  librarianSummary: LibrarianNotificationSummary | null;
  memberSummary: MemberNotificationSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenMemberDashboard: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    if (diffMs < 0) {
      const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));
      if (futureDays <= 0) return 'due today';
      if (futureDays === 1) return 'due tomorrow';
      return `due in ${futureDays}d`;
    }

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function NotificationPopover({
  isOpen,
  onClose,
  isAdmin,
  isMemberLoggedIn,
  librarianSummary,
  memberSummary,
  loading,
  onRefresh,
  onOpenMemberDashboard,
}: NotificationPopoverProps) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = isAdmin
    ? librarianSummary?.totalCount ?? 0
    : isMemberLoggedIn
      ? memberSummary?.totalCount ?? 0
      : 0;

  const handleLibrarianAction = () => {
    onClose();
    router.push('/issue-return');
  };

  const handleMemberAction = () => {
    onClose();
    onOpenMemberDashboard();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl bg-white dark:bg-[#181920] border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100"
      role="dialog"
      aria-label="Notifications popover"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Bell size={14} />
          </div>
          <span className="text-sm font-bold text-neutral-900 dark:text-white">Notifications</span>
          {totalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
              {totalCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh notifications"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-purple-600' : ''} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {loading && totalCount === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
            <p className="text-xs">Checking for updates…</p>
          </div>
        ) : !isAdmin && !isMemberLoggedIn ? (
          <div className="py-10 px-5 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-2.5">
              <User size={18} />
            </div>
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-200">
              Sign in to see notifications
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
              Log in as a member or librarian to view book request alerts, return requests, and due date reminders.
            </p>
          </div>
        ) : totalCount === 0 ? (
          <div className="py-10 px-5 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
              <BellOff size={18} />
            </div>
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-200">
              No new notifications
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
              You&apos;re completely caught up! We will notify you when new requests or updates arrive.
            </p>
          </div>
        ) : isAdmin ? (
          // ================= LIBRARIAN ALERTS =================
          <div>
            {/* Member Return Submissions */}
            {librarianSummary?.returnRequests && librarianSummary.returnRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-amber-50/60 dark:bg-amber-950/20 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 border-b border-amber-100 dark:border-amber-900/30">
                  <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                  <span>Pending Return Verifications ({librarianSummary.returnRequests.length})</span>
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {librarianSummary.returnRequests.map((item) => (
                    <div
                      key={item.id}
                      onClick={handleLibrarianAction}
                      className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition cursor-pointer group flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-900 dark:text-neutral-100 line-clamp-2">
                          <span className="font-bold">{item.memberName}</span>{' '}
                          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                            {item.memberCode}
                          </span>{' '}
                          submitted return for{' '}
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            &ldquo;{item.bookTitle}&rdquo;
                          </span>
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400">
                          <span>{formatRelativeTime(item.requestedAt)}</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                            Verify <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Borrow Requests */}
            {librarianSummary?.borrowRequests && librarianSummary.borrowRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-purple-50/60 dark:bg-purple-950/20 text-[11px] font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1.5 border-b border-purple-100 dark:border-purple-900/30">
                  <BookOpen size={12} className="text-purple-600 dark:text-purple-400" />
                  <span>Borrow Requests ({librarianSummary.borrowRequests.length})</span>
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {librarianSummary.borrowRequests.map((item) => (
                    <div
                      key={item.id}
                      onClick={handleLibrarianAction}
                      className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition cursor-pointer group flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-900 dark:text-neutral-100 line-clamp-2">
                          <span className="font-bold">{item.memberName}</span>{' '}
                          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                            {item.memberCode}
                          </span>{' '}
                          requested{' '}
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            &ldquo;{item.bookTitle}&rdquo;
                          </span>
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400">
                          <span>{formatRelativeTime(item.createdAt)}</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                            Review <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // ================= MEMBER ALERTS =================
          <div>
            {memberSummary?.items.map((item) => {
              const isApproved = item.type === 'request_approved';
              const isRejected = item.type === 'request_rejected';
              const isOverdue = item.type === 'loan_overdue';
              const isDueSoon = item.type === 'loan_due_soon';

              return (
                <div
                  key={item.id}
                  onClick={handleMemberAction}
                  className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition cursor-pointer group flex items-start gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isApproved
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                        : isRejected
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                          : isOverdue
                            ? 'bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isApproved && <CheckCircle2 size={15} />}
                    {isRejected && <XCircle size={15} />}
                    {isOverdue && <AlertCircle size={15} />}
                    {isDueSoon && <Clock size={15} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                    <div className="mt-1 text-right">
                      <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center justify-end gap-0.5 group-hover:translate-x-0.5 transition">
                        View details <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {(isAdmin || isMemberLoggedIn) && (
        <div className="p-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 text-center">
          {isAdmin ? (
            <button
              onClick={handleLibrarianAction}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Go to Circulation Desk</span>
              <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleMemberAction}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen size={14} />
              <span>Open My Books &amp; Requests</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
