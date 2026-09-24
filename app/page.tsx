'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, X, BarChart3, BookMarked, Users2, TrendingUp } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import Navbar from '@/app/components/Navbar';
import BottomNav from '@/app/components/BottomNav';
import BookCard from '@/app/components/BookCard';
import FilterPills from '@/app/components/FilterPills';
import AddBookModal from '@/app/components/AddBookModal';
import type { Book, AddBookFormData } from '@/app/lib/types';

/* ─────────────────────────── MOCK DATA ─────────────────────────── */
const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'The Hitchhiker\'s Guide to the Galaxy',
    subtitle: 'A Trilogy in Five Parts',
    authors: ['Douglas Adams'],
    genres: ['Sci-Fi', 'Fiction', 'Comedy'],
    language: 'English',
    isTranslated: false,
    location: { shelf: 'A1', row: '3', slot: '12' },
    copies: 3,
    publishedYear: 1979,
    coverUrl: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
    availability: 'available',
    isbn: '9780330258647',
  },
  {
    id: '2',
    title: 'দেশে বিদেশে',
    subtitle: '',
    authors: ['সৈয়দ মুজতবা আলী'],
    genres: ['Non-Fiction', 'Travel', 'Bengali Literature'],
    language: 'Bengali',
    isTranslated: false,
    location: { shelf: 'B2', row: '1', slot: '5' },
    copies: 2,
    publishedYear: 1949,
    coverUrl: 'https://covers.openlibrary.org/b/id/12547704-L.jpg',
    availability: 'available',
  },
  {
    id: '3',
    title: 'Sapiens: A Brief History of Humankind',
    subtitle: '',
    authors: ['Yuval Noah Harari'],
    genres: ['History', 'Non-Fiction', 'Anthropology'],
    language: 'English',
    isTranslated: false,
    location: { shelf: 'C3', row: '2', slot: '8' },
    copies: 4,
    publishedYear: 2011,
    coverUrl: 'https://covers.openlibrary.org/b/id/8739166-L.jpg',
    availability: 'issued',
    isbn: '9780062316097',
  },
  {
    id: '4',
    title: 'আমার ছেলেবেলা',
    subtitle: '',
    authors: ['রবীন্দ্রনাথ ঠাকুর'],
    genres: ['Biography', 'Bengali Literature', 'Poetry'],
    language: 'Bengali',
    isTranslated: false,
    location: { shelf: 'B4', row: '2', slot: '15' },
    copies: 1,
    publishedYear: 1940,
    coverUrl: '',
    availability: 'available',
  },
  {
    id: '5',
    title: '1984',
    subtitle: '',
    authors: ['George Orwell'],
    genres: ['Sci-Fi', 'Dystopia', 'Fiction'],
    language: 'English',
    isTranslated: false,
    location: { shelf: 'A2', row: '4', slot: '7' },
    copies: 5,
    publishedYear: 1949,
    coverUrl: 'https://covers.openlibrary.org/b/id/8575708-L.jpg',
    availability: 'available',
    isbn: '9780451524935',
  },
  {
    id: '6',
    title: 'পথের পাঁচালী',
    subtitle: 'আম আঁটির ভেঁপু',
    authors: ['বিভূতিভূষণ বন্দ্যোপাধ্যায়'],
    genres: ['Fiction', 'Bengali Literature', 'Drama'],
    language: 'Bengali',
    isTranslated: false,
    location: { shelf: 'B3', row: '1', slot: '3' },
    copies: 3,
    publishedYear: 1929,
    coverUrl: 'https://covers.openlibrary.org/b/id/12547706-L.jpg',
    availability: 'issued',
  },
  {
    id: '7',
    title: 'The Alchemist',
    subtitle: '',
    authors: ['Paulo Coelho'],
    genres: ['Fiction', 'Philosophy', 'Adventure'],
    language: 'English',
    isTranslated: true,
    originalLanguage: 'Portuguese',
    location: { shelf: 'D1', row: '2', slot: '10' },
    copies: 6,
    publishedYear: 1988,
    coverUrl: 'https://covers.openlibrary.org/b/id/8739171-L.jpg',
    availability: 'available',
    isbn: '9780061122415',
  },
  {
    id: '8',
    title: 'মুক্তিযুদ্ধের ইতিহাস',
    subtitle: 'বাংলাদেশের স্বাধীনতা সংগ্রাম',
    authors: ['মেজর রফিকুল ইসলাম', 'আবদুল করিম'],
    genres: ['History', 'Non-Fiction', 'Bengali Literature'],
    language: 'Bengali',
    isTranslated: false,
    location: { shelf: 'C1', row: '3', slot: '2' },
    copies: 2,
    publishedYear: 1985,
    coverUrl: '',
    availability: 'available',
  },
  {
    id: '9',
    title: 'Thinking, Fast and Slow',
    subtitle: '',
    authors: ['Daniel Kahneman'],
    genres: ['Non-Fiction', 'Psychology', 'Philosophy'],
    language: 'English',
    isTranslated: false,
    location: { shelf: 'E2', row: '1', slot: '18' },
    copies: 3,
    publishedYear: 2011,
    coverUrl: 'https://covers.openlibrary.org/b/id/8739168-L.jpg',
    availability: 'issued',
    isbn: '9780374533557',
  },
  {
    id: '10',
    title: 'গল্পগুচ্ছ',
    subtitle: 'রবীন্দ্রনাথের ছোটগল্প সমগ্র',
    authors: ['রবীন্দ্রনাথ ঠাকুর'],
    genres: ['Fiction', 'Poetry', 'Bengali Literature'],
    language: 'Bengali',
    isTranslated: false,
    location: { shelf: 'B1', row: '5', slot: '1' },
    copies: 4,
    publishedYear: 1900,
    coverUrl: '',
    availability: 'available',
  },
];

const ALL_GENRES = [
  'All',
  'Sci-Fi',
  'History',
  'Non-Fiction',
  'Poetry',
  'Fiction',
  'Biography',
  'Philosophy',
  'Drama',
  'Bengali Literature',
  'Psychology',
  'Travel',
  'Dystopia',
  'Adventure',
  'Comedy',
  'Anthropology',
];

/* ─────────────────────────── STAT CARD ─────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${accent}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── MOBILE SEARCH ─────────────────────── */
function MobileSearchBar({
  searchQuery,
  onSearchChange,
  onClose,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="md:hidden fixed inset-x-0 top-16 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center gap-2">
      <Search className="w-4 h-4 text-slate-400 shrink-0" />
      <input
        id="mobile-search"
        type="search"
        placeholder="Search Title, Author, ISBN…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        autoFocus
        aria-label="Search books"
        className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
      />
      <button onClick={onClose} aria-label="Close search" className="p-1 text-slate-400 hover:text-slate-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────── PAGE ─────────────────────────── */
export default function CatalogPage() {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [activeNav, setActiveNav] = useState('catalog');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [genres, setGenres] = useState<string[]>(
    ALL_GENRES.filter((g) => g !== 'All')
  );

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return books.filter((book) => {
      const matchesGenre =
        activeGenre === 'All' || book.genres.includes(activeGenre);
      if (!matchesGenre) return false;
      if (!q) return true;
      return (
        book.title.toLowerCase().includes(q) ||
        book.authors.some((a) => a.toLowerCase().includes(q)) ||
        (book.isbn?.toLowerCase().includes(q) ?? false) ||
        book.subtitle?.toLowerCase().includes(q)
      );
    });
  }, [books, searchQuery, activeGenre]);

  // Stats
  const stats = useMemo(
    () => ({
      total: books.reduce((acc, b) => acc + b.copies, 0),
      available: books.filter((b) => b.availability === 'available').length,
      issued: books.filter((b) => b.availability === 'issued').length,
      genres: genres.length,
    }),
    [books, genres]
  );

  const handleAddBook = useCallback((data: AddBookFormData) => {
    const newBook: Book = {
      id: Date.now().toString(),
      title: data.title,
      subtitle: data.subtitle,
      authors: data.authors.length ? data.authors : ['Unknown'],
      genres: data.genres,
      language: data.language,
      isTranslated: data.isTranslated,
      originalLanguage: data.originalLanguage,
      location: { shelf: data.shelf || '?', row: data.row || '?', slot: data.slot || '?' },
      copies: data.copies,
      publishedYear: data.publishedYear,
      coverUrl: data.coverUrl,
      availability: 'available',
    };
    setBooks((prev) => [newBook, ...prev]);
    // Merge new genres
    const newGenres = data.genres.filter((g) => !genres.includes(g));
    if (newGenres.length) setGenres((prev) => [...prev, ...newGenres]);
  }, [genres]);

  const handleIssueBook = useCallback((book: Book) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === book.id
          ? { ...b, availability: b.availability === 'available' ? 'issued' : 'available' }
          : b
      )
    );
  }, []);

  const handleDeleteBook = useCallback((bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  }, []);

  const handleEditBook = useCallback((book: Book) => {
    // For now, open add modal pre-filled (simplified — full edit form would share the same component)
    console.log('Edit book:', book.id);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Navbar */}
        <Navbar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Mobile search bar */}
        {mobileSearchOpen && (
          <MobileSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={() => setMobileSearchOpen(false)}
          />
        )}

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 px-4 md:px-6 py-5 pb-24 md:pb-8 space-y-6"
        >
          {/* Page heading */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Book Catalog
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {filteredBooks.length} of {books.length} books
              </p>
            </div>
            {/* Add Book — desktop */}
            <button
              id="add-book-desktop-btn"
              onClick={() => setAddModalOpen(true)}
              aria-label="Add a new book"
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              Add Book
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Volumes"
              value={stats.total.toLocaleString()}
              icon={BookMarked}
              accent="bg-violet-500"
            />
            <StatCard
              label="Available"
              value={stats.available}
              icon={BarChart3}
              accent="bg-emerald-500"
            />
            <StatCard
              label="Issued"
              value={stats.issued}
              icon={TrendingUp}
              accent="bg-amber-500"
            />
            <StatCard
              label="Genres"
              value={stats.genres}
              icon={Users2}
              accent="bg-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <FilterPills
            genres={genres}
            activeGenre={activeGenre}
            onGenreChange={setActiveGenre}
          />

          {/* Mobile search trigger */}
          <button
            id="mobile-search-trigger"
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-400 shadow-sm"
            aria-label="Open search"
          >
            <Search className="w-4 h-4" />
            Search by Title, Author, ISBN…
          </button>

          {/* Book Grid */}
          {filteredBooks.length > 0 ? (
            <section aria-label="Book catalog grid">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onIssue={handleIssueBook}
                    onEdit={handleEditBook}
                    onDelete={handleDeleteBook}
                  />
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookMarked className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No books found</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Try changing your search or filters
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        id="add-book-fab"
        onClick={() => setAddModalOpen(true)}
        aria-label="Add a new book"
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-full shadow-lg shadow-violet-600/40 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Bottom Nav */}
      <BottomNav activeNav={activeNav} onNavChange={setActiveNav} />

      {/* Add Book Modal / Bottom Sheet */}
      <AddBookModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddBook}
        existingGenres={genres}
      />
    </div>
  );
}
