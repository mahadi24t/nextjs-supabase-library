'use client';

import { Sun, Moon, Search, Bell, Library } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface NavbarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchFocus?: () => void;
}

export default function Navbar({
  darkMode,
  onToggleDark,
  searchQuery,
  onSearchChange,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-4 md:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      {/* Mobile branding */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shrink-0">
          <Library className="w-4 h-4 text-white" />
        </div>
        <span className="text-slate-900 dark:text-white font-semibold text-lg tracking-tight">
          LibStack
        </span>
      </div>

      {/* Search bar — desktop always visible, mobile hidden (triggered by icon) */}
      <div className="hidden md:flex flex-1 max-w-xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id="global-search"
          type="search"
          placeholder="Search by Title, Author, ISBN…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search books by title, author, or ISBN"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification bell */}
        <button
          id="notification-btn"
          aria-label="Notifications"
          className="relative flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
        </button>

        {/* Dark mode toggle */}
        <button
          id="theme-toggle"
          onClick={onToggleDark}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile avatar */}
        <button
          id="profile-avatar"
          aria-label="User profile"
          className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <span className="text-white text-sm font-semibold select-none">LA</span>
        </button>
      </div>
    </header>
  );
}
