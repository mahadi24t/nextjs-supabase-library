'use client';

import { cn } from '@/app/lib/utils';

interface FilterPillsProps {
  genres: string[];
  activeGenre: string;
  onGenreChange: (genre: string) => void;
}

export default function FilterPills({ genres, activeGenre, onGenreChange }: FilterPillsProps) {
  const allGenres = ['All', ...genres];

  return (
    <div
      role="group"
      aria-label="Filter books by genre"
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {allGenres.map((genre) => (
        <button
          key={genre}
          id={`filter-pill-${genre.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={() => onGenreChange(genre)}
          aria-pressed={activeGenre === genre}
          className={cn(
            'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            activeGenre === genre
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
