'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ArrowLeftRight, Users, Settings, Lock } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { cn } from '@/app/lib/utils';

interface BottomNavProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
}

const BOTTOM_NAV_ITEMS = [
  { id: 'catalog', label: 'Catalog', href: '/', icon: BookOpen, requiresAdmin: false },
  { id: 'issue-return', label: 'Borrow', href: '/issue-return', icon: ArrowLeftRight, requiresAdmin: true },
  { id: 'members', label: 'Members', href: '/members', icon: Users, requiresAdmin: true },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, requiresAdmin: true },
];

export default function BottomNav({ activeNav: propActiveNav, onNavChange }: BottomNavProps) {
  const pathname = usePathname();
  const { isAdmin, openLoginModal } = useAuth();

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
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom"
    >
      <ul className="flex items-stretch h-16">
        {BOTTOM_NAV_ITEMS.map(({ id, label, href, icon: Icon, requiresAdmin }) => {
          const isActive = activeNav === id;
          const isLocked = requiresAdmin && !isAdmin;

          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                id={`bottom-nav-${id}`}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    openLoginModal(`Sign in as Administrator to access ${label}.`);
                    return;
                  }
                  onNavChange?.(id);
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isLocked ? `${label} (Requires Admin Login)` : label}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset relative',
                  isActive
                    ? 'text-violet-600 dark:text-violet-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                  isLocked && 'opacity-85',
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform duration-150',
                      isActive && 'scale-110 text-violet-600 dark:text-violet-400',
                    )}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                  {isLocked && (
                    <span className="absolute -top-1 -right-2 flex items-center justify-center w-3 h-3 bg-slate-800 rounded-full text-amber-400 ring-1 ring-white dark:ring-slate-900">
                      <Lock className="w-2 h-2" />
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-0.5">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

