'use client';

import { BookOpen, ArrowDownUp, ScanLine, Users, Settings } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface BottomNavProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
}

const BOTTOM_NAV_ITEMS = [
  { id: 'catalog', label: 'Catalog', icon: BookOpen },
  { id: 'issue-return', label: 'Borrow', icon: ArrowDownUp },
  { id: 'scan', label: 'Scan / Search', icon: ScanLine },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BottomNav({ activeNav, onNavChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom"
    >
      <ul className="flex items-stretch h-16">
        {BOTTOM_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <li key={id} className="flex-1">
            <button
              id={`bottom-nav-${id}`}
              onClick={() => onNavChange(id)}
              aria-current={activeNav === id ? 'page' : undefined}
              aria-label={label}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset',
                activeNav === id
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform',
                  activeNav === id && 'scale-110'
                )}
                strokeWidth={activeNav === id ? 2.5 : 1.75}
              />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
