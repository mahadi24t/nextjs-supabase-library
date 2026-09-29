'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, KeyRound, BookOpen } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import Navbar from '@/app/components/Navbar';
import BottomNav from '@/app/components/BottomNav';
import { useAuth } from '@/app/context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
}

export default function AppLayout({
  children,
  title,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: AppLayoutProps) {
  const { isAdmin, openLoginModal } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((prev) => !prev)}
          title={title}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        <main id="main-content" className="flex-1 px-4 md:px-6 py-5 pb-24 md:pb-8 space-y-6">
          {isAdmin ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto p-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Administrator Access Required
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                This section contains administrative library operations. Please authenticate with your admin passcode to proceed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <button
                  type="button"
                  onClick={() => openLoginModal(`Enter administrator passcode to access ${title || 'this section'}.`)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold transition-all shadow-md shadow-violet-600/30 min-h-[44px]"
                >
                  <KeyRound className="w-4 h-4" />
                  Enter Admin Passcode
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors min-h-[44px]"
                >
                  <BookOpen className="w-4 h-4" />
                  Return to Catalog
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

