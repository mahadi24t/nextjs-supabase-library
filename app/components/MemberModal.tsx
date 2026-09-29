'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, User, Mail, Phone, Hash, LoaderCircle } from 'lucide-react';
import { createMember, updateMember } from '@/app/lib/supabase';
import { cn } from '@/app/lib/utils';
import type { Member, MemberFormData, MemberStatus } from '@/app/lib/types';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberSaved: () => Promise<void> | void;
  memberToEdit?: Member | null;
  suggestedCode?: string;
}

function MemberModalContent({
  onClose,
  onMemberSaved,
  memberToEdit,
  suggestedCode = 'MEM-001',
}: Omit<MemberModalProps, 'isOpen'>) {
  const isEditing = Boolean(memberToEdit);

  const initialData = useMemo<MemberFormData>(() => {
    if (memberToEdit) {
      return {
        memberCode: memberToEdit.memberCode,
        fullName: memberToEdit.fullName,
        email: memberToEdit.email ?? '',
        phone: memberToEdit.phone ?? '',
        status: memberToEdit.status,
      };
    }
    return {
      memberCode: suggestedCode,
      fullName: '',
      email: '',
      phone: '',
      status: 'active' as MemberStatus,
    };
  }, [memberToEdit, suggestedCode]);

  const [form, setForm] = useState<MemberFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => firstFocusRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.memberCode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (memberToEdit) {
        await updateMember(memberToEdit.id, form);
      } else {
        await createMember(form);
      }
      await onMemberSaved();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save member details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all';

  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5';

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="member-modal-title"
    >
      <div
        className={cn(
          'w-full md:max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col',
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
            <h2 id="member-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'Edit Member' : 'Register New Member'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditing ? 'Update patron contact details and membership status.' : 'Add a library patron to borrow and track books.'}
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

        {/* Scrollable Form */}
        <form id="member-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5 flex-1" noValidate>
          {submitError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {submitError}
            </div>
          )}

          {/* Member Code */}
          <div>
            <label htmlFor="member-code" className={labelClass}>
              Member Code / ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="member-code"
                type="text"
                placeholder="MEM-001"
                value={form.memberCode}
                onChange={(e) => setForm((prev) => ({ ...prev, memberCode: e.target.value.toUpperCase() }))}
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="member-fullname" className={labelClass}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="member-fullname"
                ref={firstFocusRef}
                type="text"
                placeholder="e.g. Tahmid Rahman"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="member-email" className={labelClass}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="member-email"
                type="email"
                placeholder="tahmid@example.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="member-phone" className={labelClass}>
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="member-phone"
                type="tel"
                placeholder="+880 1711-000000"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="member-status" className={labelClass}>
              Membership Status
            </label>
            <select
              id="member-status"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as MemberStatus }))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 transition-all"
            >
              <option value="active">Active (Eligible to borrow)</option>
              <option value="suspended">Suspended (Borrowing restricted)</option>
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="submit"
            form="member-form"
            id="save-member-btn"
            disabled={!form.fullName.trim() || !form.memberCode.trim() || isSubmitting}
            className="flex-1 py-2.5 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </span>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Add Member'
            )}
          </button>
          <button
            type="button"
            id="cancel-member-btn"
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

export default function MemberModal(props: MemberModalProps) {
  if (!props.isOpen) return null;
  return <MemberModalContent key={props.memberToEdit?.id ?? 'create-member'} {...props} />;
}
