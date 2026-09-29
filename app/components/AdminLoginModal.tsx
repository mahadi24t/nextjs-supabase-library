'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ShieldCheck, KeyRound, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { cn } from '@/app/lib/utils';

function AdminLoginModalContent() {
  const { closeLoginModal, login, loginPromptReason } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLoginModal();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeLoginModal]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) closeLoginModal();
    },
    [closeLoginModal],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    const success = login(password);
    if (!success) {
      setErrorMsg('Invalid admin passcode. Please check and try again.');
    }
  };


  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="admin-login-title"
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 id="admin-login-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Librarian Login
            </h2>
          </div>
          <button
            onClick={closeLoginModal}
            aria-label="Close login dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {loginPromptReason ? (
            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-900/40 text-xs text-violet-800 dark:text-violet-300">
              {loginPromptReason}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter your library administrator passcode to unlock catalog management, member administration, and book circulation.
            </p>
          )}

          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="admin-passcode" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Admin Passcode
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="admin-passcode"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (default: admin123)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                required
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/25 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[40px]',
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              Authenticate
            </button>
            <button
              type="button"
              onClick={closeLoginModal}
              className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginModal() {
  const { isLoginModalOpen } = useAuth();
  if (!isLoginModalOpen) return null;
  return <AdminLoginModalContent />;
}

