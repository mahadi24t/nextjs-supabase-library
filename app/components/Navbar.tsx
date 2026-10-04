'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, Search, Bell, Library, LogOut, ShieldCheck, Lock, User } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useMemberAuth } from '@/app/context/MemberAuthContext';
import MemberAuthModal from '@/app/components/MemberAuthModal';
import MemberDashboardModal from '@/app/components/MemberDashboardModal';

interface NavbarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  title?: string;
}

export default function Navbar({
  darkMode,
  onToggleDark,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search Title, Author, ISBN…',
  title,
}: NavbarProps) {
  const { isAdmin, logout, openLoginModal } = useAuth();
  const { currentMember, isMemberLoggedIn } = useMemberAuth();
  const [memberAuthOpen, setMemberAuthOpen] = useState(false);
  const [memberDashboardOpen, setMemberDashboardOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('libstack_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('libstack_theme', isDark ? 'dark' : 'light');
    setIsDarkMode(isDark);
    onToggleDark?.();
  };

  const showSearch = searchQuery !== undefined && onSearchChange !== undefined;

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-3 md:gap-4 px-3 sm:px-4 md:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      {/* Mobile branding */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shrink-0 shadow-md shadow-violet-600/30">
            <Library className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 dark:text-white font-bold text-lg tracking-tight">
            LibStack
          </span>
        </Link>
      </div>

      {/* Desktop Search bar or Page Title */}
      {showSearch ? (
        <div className="hidden md:flex flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="global-search"
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all"
          />
        </div>
      ) : title ? (
        <div className="hidden md:flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
            {title}
          </h2>
        </div>
      ) : (
        <div className="hidden md:block flex-1" />
      )}

      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {/* Notification bell */}
        <button
          id="notification-btn"
          aria-label="Notifications"
          className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />
        </button>

        {/* Dark mode toggle */}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-neutral-600" />
          )}
        </button>

        {/* Member Authentication Status / Actions */}
        {isMemberLoggedIn && currentMember ? (
          <button
            id="member-profile-btn"
            onClick={() => setMemberDashboardOpen(true)}
            aria-label={`Member profile: ${currentMember.fullName}`}
            title="View My Borrowed Books & Requests"
            className="flex items-center gap-2 pl-1 pr-2.5 sm:pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[36px] group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
              {currentMember.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-left">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[85px] sm:max-w-[130px]">
                {currentMember.fullName.split(' ')[0]}
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 font-medium shrink-0">
                {currentMember.memberCode}
              </span>
            </div>
          </button>
        ) : (
          <button
            id="member-login-btn"
            onClick={() => setMemberAuthOpen(true)}
            aria-label="Member Login"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[36px] cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="hidden sm:inline">Member Login</span>
            <span className="sm:hidden">Member</span>
          </button>
        )}

        {/* Admin Authentication Status / Actions */}
        {isAdmin ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            {/* Admin Badge */}
            <div
              id="admin-status-badge"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800 text-xs font-semibold text-violet-700 dark:text-violet-300 select-none shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Admin</span>
            </div>

            {/* "LA" Avatar Circle — clickable to trigger logout */}
            <button
              id="profile-avatar"
              onClick={logout}
              title="Librarian Admin — Click to Logout"
              aria-label="Librarian Admin Profile (Click to Logout)"
              className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-violet-600 text-white text-xs font-bold shadow-md shadow-violet-600/30 hover:opacity-90 active:scale-95 transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              LA
            </button>

            {/* Subtle Logout button */}
            <button
              id="admin-logout-btn"
              onClick={logout}
              title="Log out of Admin mode"
              aria-label="Log out of Admin mode"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            id="admin-login-btn"
            onClick={() => openLoginModal()}
            aria-label="Librarian Login"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold bg-violet-600 hover:bg-violet-700 active:scale-95 text-white transition-all shadow-md shadow-violet-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[36px]"
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Librarian Login</span>
          </button>
        )}
      </div>

      {/* Member Modals */}
      <MemberAuthModal
        isOpen={memberAuthOpen}
        onClose={() => setMemberAuthOpen(false)}
      />
      <MemberDashboardModal
        isOpen={memberDashboardOpen}
        onClose={() => setMemberDashboardOpen(false)}
      />
    </header>
  );
}


