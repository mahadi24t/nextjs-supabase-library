'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Clock, CheckCircle2, XCircle, Ban, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useMemberAuth } from '@/app/context/MemberAuthContext';
import { fetchMemberActiveIssues, fetchMemberBookRequests, cancelBookRequest } from '@/app/lib/supabase';
import type { BookIssue, BookRequest } from '@/app/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberDashboardModal({ isOpen, onClose }: Props) {
  const { currentMember, logoutMember } = useMemberAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrowed' | 'requests'>('borrowed');
  const [activeLoans, setActiveLoans] = useState<BookIssue[]>([]);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadData = async () => {
    if (!currentMember?.id) return;
    setLoading(true);
    try {
      const [loansData, requestsData] = await Promise.all([
        fetchMemberActiveIssues(currentMember.id),
        fetchMemberBookRequests(currentMember.id),
      ]);
      setActiveLoans(loansData);
      setRequests(requestsData);
    } catch (err) {
      console.error('Error loading member dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentMember?.id) {
      loadData();
    }
  }, [isOpen, currentMember?.id]);

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancellingId(requestId);
      await cancelBookRequest(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' } : r)),
      );
    } catch (err) {
      console.error('Failed to cancel request:', err);
    } finally {
      setCancellingId(null);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#181920] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky/Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-[#181920]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-md">
              {currentMember?.fullName?.charAt(0)?.toUpperCase() || 'M'}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white truncate">
                {currentMember?.fullName || 'Member Profile'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                  {currentMember?.memberCode}
                </span>
                <span className="truncate">{currentMember?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                logoutMember();
                onClose();
              }}
              title="Logout"
              className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg transition font-medium cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={onClose}
              title="Close modal"
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex-shrink-0 flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/40 px-4 pt-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('borrowed')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'borrowed'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
            }`}
          >
            <span>Currently Borrowed</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-800 rounded-full font-mono">
              {activeLoans.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
            }`}
          >
            <span>My Requests</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-800 rounded-full font-mono">
              {requests.length}
            </span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              <p className="text-xs">Loading records...</p>
            </div>
          ) : activeTab === 'borrowed' ? (
            activeLoans.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <BookOpen size={22} />
                </div>
                <h4 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                  No books currently borrowed
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
                  You have no active loans right now. Request a book from the catalog to borrow it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
                  >
                    {loan.book?.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={loan.book.coverUrl}
                        alt={loan.book.title}
                        className="w-12 h-16 object-cover rounded-md flex-shrink-0 shadow-sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {loan.book?.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Due: {new Date(loan.dueDate).toLocaleDateString()}
                      </p>
                      {loan.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium mt-1">
                          <AlertCircle size={12} /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
                          <CheckCircle2 size={12} /> Active loan
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : requests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-3">
                <Clock size={22} />
              </div>
              <h4 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                No requests found
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
                You haven&apos;t requested any books yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {req.book?.title || 'Unknown Book'}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Requested: {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-1">
                      {req.status === 'pending' && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock size={12} /> Under Review
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                      {req.status === 'cancelled' && (
                        <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                          <Ban size={12} /> Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      disabled={cancellingId === req.id}
                      className="text-xs text-neutral-500 hover:text-red-500 p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition flex-shrink-0 cursor-pointer"
                    >
                      {cancellingId === req.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
