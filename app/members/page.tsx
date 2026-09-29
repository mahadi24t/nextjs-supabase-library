'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Calendar,
  LoaderCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import MemberModal from '@/app/components/MemberModal';
import { useAuth } from '@/app/context/AuthContext';
import { fetchMembers, deleteMember } from '@/app/lib/supabase';
import { cn } from '@/app/lib/utils';
import type { Member } from '@/app/lib/types';

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

export default function MembersPage() {
  const { isAdmin, openLoginModal } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchMembers();
      setMembers(data);
      setErrorMsg(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load members.';
      setErrorMsg(
        msg.includes('relation "public.members" does not exist')
          ? 'The "members" table was not found in Supabase. Please run the SQL migration in supabase/schema.sql.'
          : msg,
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitial() {
      try {
        const data = await fetchMembers();
        if (!isMounted) return;
        setMembers(data);
        setErrorMsg(null);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load members.';
        setErrorMsg(
          msg.includes('relation "public.members" does not exist')
            ? 'The "members" table was not found in Supabase. Please run the SQL migration in supabase/schema.sql.'
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

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === 'active').length;
    const suspended = members.filter((m) => m.status === 'suspended').length;
    const borrowing = members.filter((m) => (m.activeLoansCount ?? 0) > 0).length;
    return { total, active, suspended, borrowing };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false) ||
        (m.phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [members, searchQuery, statusFilter]);

  const suggestedCode = useMemo(() => {
    return `MEM-${String(members.length + 1).padStart(3, '0')}`;
  }, [members.length]);

  const handleDelete = async (member: Member) => {
    if ((member.activeLoansCount ?? 0) > 0) {
      alert(`Cannot delete ${member.fullName} while they have active borrowed books.`);
      return;
    }

    if (!confirm(`Are you sure you want to remove member ${member.fullName} (${member.memberCode})?`)) {
      return;
    }

    setDeletingId(member.id);
    try {
      await deleteMember(member.id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete member.');
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout
      title="Members Management"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search members by name, ID, email…"
    >
      {/* Page Title & Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Library Members
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isLoading ? 'Loading members…' : `${filteredMembers.length} of ${members.length} registered patrons`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingMember(null);
              setModalOpen(true);
            }}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Add Member
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
        <StatCard label="Total Members" value={stats.total} icon={Users} accent="bg-violet-500" />
        <StatCard label="Active Patrons" value={stats.active} icon={UserCheck} accent="bg-emerald-500" />
        <StatCard label="Active Borrowers" value={stats.borrowing} icon={BookOpen} accent="bg-blue-500" />
        <StatCard label="Suspended" value={stats.suspended} icon={UserX} accent="bg-rose-500" />
      </div>

      {/* Filter Tabs + Mobile Search Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              statusFilter === 'suspended'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            Suspended ({stats.suspended})
          </button>
        </div>

        {/* Mobile Search input */}
        <div className="md:hidden w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search members…"
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
            <p className="font-semibold">Unable to load members</p>
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

      {/* Members List / Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <LoaderCircle className="w-8 h-8 animate-spin text-violet-500 mb-3" />
          <span className="text-sm font-medium">Fetching registered patrons…</span>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Active Loans</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                    {/* Member Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center text-xs shadow-inner">
                            {getInitials(member.fullName)}
                          </div>
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800',
                              member.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500',
                            )}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {member.fullName}
                          </div>
                          <div className="inline-block mt-0.5 font-mono text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.2 rounded border border-violet-200/50 dark:border-violet-800/40">
                            {member.memberCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {member.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{member.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No email</span>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                          member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            member.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500',
                          )}
                        />
                        {member.status}
                      </span>
                    </td>

                    {/* Active Loans */}
                    <td className="px-4 py-3.5 text-center">
                      {(member.activeLoansCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                          <BookOpen className="w-3.5 h-3.5" />
                          {member.activeLoansCount} active
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>

                    {/* Date Joined */}
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(member.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {!isAdmin ? (
                        <span className="text-xs text-slate-400 italic">Read-only</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingMember(member);
                              setModalOpen(true);
                            }}
                            aria-label={`Edit ${member.fullName}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(member)}
                            disabled={deletingId === member.id}
                            aria-label={`Delete ${member.fullName}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            {deletingId === member.id ? (
                              <LoaderCircle className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No members found
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            {searchQuery
              ? 'Try changing your search query or filter settings.'
              : 'Add your first library member to start checking out and tracking books.'}
          </p>
        </div>
      )}

      {/* Mobile FAB */}
      {isAdmin && (
        <button
          onClick={() => {
            setEditingMember(null);
            setModalOpen(true);
          }}
          aria-label="Add Member"
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-full shadow-lg shadow-violet-600/40 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Member Modal */}
      <MemberModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingMember(null);
        }}
        onMemberSaved={loadData}
        memberToEdit={editingMember}
        suggestedCode={suggestedCode}
      />
    </AppLayout>
  );
}
