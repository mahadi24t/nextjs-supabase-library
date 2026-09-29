'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ArrowLeftRight, Users, Settings } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface BottomNavProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
}

const BOTTOM_NAV_ITEMS = [
  { id: 'catalog', label: 'Catalog', href: '/', icon: BookOpen },
  { id: 'issue-return', label: 'Borrow', href: '/issue-return', icon: ArrowLeftRight },
  { id: 'members', label: 'Members', href: '/members', icon: Users },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

export default function BottomNav({ activeNav: propActiveNav, onNavChange }: BottomNavProps) {
  const pathname = usePathname();

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
        {BOTTOM_NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeNav === id;
          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                id={`bottom-nav-${id}`}
                onClick={() => onNavChange?.(id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset',
                  isActive
                    ? 'text-violet-600 dark:text-violet-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-150',
                    isActive && 'scale-110 text-violet-600 dark:text-violet-400',
                  )}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
