'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  LogIn,
  UserPlus,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { registerMember, getMemberByEmail } from '@/app/lib/supabase';
import { useMemberAuth } from '@/app/context/MemberAuthContext';
import { cn } from '@/app/lib/utils';

type Tab = 'login' | 'register';

interface MemberAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful login or registration */
  onSuccess?: () => void;
}

function MemberAuthModalContent({
  onClose,
  onSuccess,
}: Omit<MemberAuthModalProps, 'isOpen'>) {
  const { loginMember } = useMemberAuth();
  const [tab, setTab] = useState<Tab>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => firstInputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [tab]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const member = await getMemberByEmail(loginEmail.trim());
      if (!member) {
        setLoginError('No member account found with that email address. Please register first.');
        return;
      }
      if (member.status === 'suspended') {
        setLoginError('Your membership is currently suspended. Please contact the librarian.');
        return;
      }
      loginMember(member);
      onSuccess?.();
      onClose();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to look up member. Try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    setRegLoading(true);
    setRegError(null);
    try {
      const newMember = await registerMember({
        fullName: regName,
        email: regEmail,
        phone: regPhone || undefined,
      });
      setRegSuccess(true);
      loginMember(newMember);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const inputClass =
    'w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700/70 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all';
  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5';

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/65 backdrop-blur-sm p-0 md:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="member-auth-title"
    >
      <div
        className={cn(
          'w-full md:max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col',
          'rounded-t-2xl md:rounded-2xl border-t border-slate-200 dark:border-slate-700 md:border',
          'max-h-[92dvh] md:max-h-[88dvh]',
        )}
      >
        {/* Grab handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 id="member-auth-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Member Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sign in or create a membership to request books.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-5 mt-4 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg shrink-0">
          <button
            id="member-auth-tab-login"
            onClick={() => { setTab('login'); setLoginError(null); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all',
              tab === 'login'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
            )}
          >
            <LogIn className="w-3.5 h-3.5" />
            Existing Member
          </button>
          <button
            id="member-auth-tab-register"
            onClick={() => { setTab('register'); setRegError(null); setRegSuccess(false); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all',
              tab === 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Member
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'login' ? (
            <form id="member-login-form" onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
              {loginError && (
                <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}
              <div>
                <label htmlFor="member-login-email" className={labelClass}>
                  Your Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="member-login-email"
                    ref={firstInputRef}
                    type="email"
                    placeholder="tahmid@example.com"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null); }}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Enter the email associated with your library membership. We&apos;ll look up your account.
              </p>
            </form>
          ) : (
            <form id="member-register-form" onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
              {regSuccess ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Welcome to LibStack!
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your membership has been created. Redirecting…
                  </p>
                </div>
              ) : (
                <>
                  {regError && (
                    <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="member-reg-name" className={labelClass}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="member-reg-name"
                        ref={firstInputRef}
                        type="text"
                        placeholder="e.g. Tahmid Rahman"
                        value={regName}
                        onChange={(e) => { setRegName(e.target.value); setRegError(null); }}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="member-reg-email" className={labelClass}>
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="member-reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={(e) => { setRegEmail(e.target.value); setRegError(null); }}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="member-reg-phone" className={labelClass}>
                      Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="member-reg-phone"
                        type="tel"
                        placeholder="+880 1711-000000"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    A unique member code will be auto-assigned. You can log back in using your email.
                  </p>
                </>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!regSuccess && (
          <div className="flex gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="submit"
              form={tab === 'login' ? 'member-login-form' : 'member-register-form'}
              id="member-auth-submit-btn"
              disabled={loginLoading || regLoading}
              className="flex-1 py-2.5 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 min-h-[44px] flex items-center justify-center gap-2"
            >
              {(loginLoading || regLoading) ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {tab === 'login' ? 'Looking up…' : 'Registering…'}
                </>
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Membership
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MemberAuthModal({ isOpen, onClose, onSuccess }: MemberAuthModalProps) {
  if (!isOpen) return null;
  return <MemberAuthModalContent onClose={onClose} onSuccess={onSuccess} />;
}
