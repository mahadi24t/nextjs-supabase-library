'use client';

import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Library,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeNav: string;
  onNavChange: (nav: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'catalog', label: 'Catalog', icon: BookOpen },
  { id: 'issue-return', label: 'Issue / Return', icon: ArrowLeftRight },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
  activeNav,
  onNavChange,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shrink-0">
          <Library className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-lg tracking-tight truncate">
            LibStack
          </span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-1 p-2 flex-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`sidebar-nav-${id}`}
            onClick={() => onNavChange(id)}
            aria-current={activeNav === id ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px] w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
              activeNav === id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

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
    </aside>
  );
}
