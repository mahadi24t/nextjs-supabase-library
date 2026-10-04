'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ArrowLeftRight,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Library,
  Lock,
  User,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useMemberAuth } from '@/app/context/MemberAuthContext';
import MemberAuthModal from '@/app/components/MemberAuthModal';
import MemberDashboardModal from '@/app/components/MemberDashboardModal';
import { cn } from '@/app/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeNav?: string;
  onNavChange?: (nav: string) => void;
}

export const NAV_ITEMS = [
  { id: 'catalog', label: 'Catalog', href: '/', icon: BookOpen, requiresAdmin: false },
  { id: 'issue-return', label: 'Issue / Return', href: '/issue-return', icon: ArrowLeftRight, requiresAdmin: true },
  { id: 'members', label: 'Members', href: '/members', icon: Users, requiresAdmin: true },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, requiresAdmin: true },
];

export default function Sidebar({
  collapsed,
  onToggle,
  activeNav: propActiveNav,
  onNavChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin, openLoginModal } = useAuth();
  const { currentMember, isMemberLoggedIn } = useMemberAuth();
  const [memberAuthOpen, setMemberAuthOpen] = useState(false);
  const [memberDashboardOpen, setMemberDashboardOpen] = useState(false);

  const activeNav =
    propActiveNav ??
    (pathname.startsWith('/issue-return')
      ? 'issue-return'
      : pathname.startsWith('/members')
        ? 'members'
        : pathname.startsWith('/settings')
          ? 'settings'
          : 'catalog');

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out z-30 select-none',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800 shrink-0">
        <Link href="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shrink-0 shadow-md shadow-violet-600/30">
            <Library className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-lg tracking-tight truncate">
              LibStack
            </span>
          )}
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-1 p-2 flex-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, href, icon: Icon, requiresAdmin }) => {
          const isActive = activeNav === id;
          const isLocked = requiresAdmin && !isAdmin;

          return (
            <Link
              key={id}
              href={href}
              id={`sidebar-nav-${id}`}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  openLoginModal(`Sign in as Administrator to access the ${label} module.`);
                  return;
                }
                onNavChange?.(id);
              }}
              aria-current={isActive ? 'page' : undefined}
              title={isLocked ? `${label} (Requires Admin Login)` : label}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px] w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 relative group',
                isActive
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                isLocked && !isActive && 'opacity-80 hover:opacity-100',
              )}
            >
              <div className="relative shrink-0">
                <Icon className="w-5 h-5" />
                {isLocked && collapsed && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-slate-900" />
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{label}</span>
                  {isLocked && (
                    <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 ml-1.5" />
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>


      {/* Member Profile / Login in Sidebar */}
      <div className="p-2 border-t border-slate-800">
        {isMemberLoggedIn && currentMember ? (
          <button
            id="sidebar-member-profile-btn"
            onClick={() => setMemberDashboardOpen(true)}
            title={`Member: ${currentMember.fullName} (${currentMember.memberCode}) - View My Books & Requests`}
            aria-label="View My Books & Requests"
            className={cn(
              'flex items-center gap-3 w-full p-2 rounded-lg text-slate-300 hover:bg-slate-800/80 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 group cursor-pointer',
              collapsed ? 'justify-center' : '',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md shadow-violet-600/30">
              {currentMember.fullName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                  {currentMember.fullName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] text-violet-400 font-medium">
                    {currentMember.memberCode}
                  </span>
                  <span className="text-[10px] text-slate-500">• My Books</span>
                </div>
              </div>
            )}
          </button>
        ) : (
          <button
            id="sidebar-member-login-btn"
            onClick={() => setMemberAuthOpen(true)}
            title="Member Login"
            aria-label="Member Login"
            className={cn(
              'flex items-center gap-3 w-full p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer',
              collapsed ? 'justify-center' : '',
            )}
          >
            <User className="w-4 h-4 shrink-0 text-slate-400" />
            {!collapsed && <span>Member Login</span>}
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-full h-10 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      <MemberAuthModal
        isOpen={memberAuthOpen}
        onClose={() => setMemberAuthOpen(false)}
      />
      <MemberDashboardModal
        isOpen={memberDashboardOpen}
        onClose={() => setMemberDashboardOpen(false)}
      />
    </aside>
  );
}
