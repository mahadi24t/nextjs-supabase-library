'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, X, BarChart3, BookMarked, Users2, TrendingUp, LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import Navbar from '@/app/components/Navbar';
import BottomNav from '@/app/components/BottomNav';
import Footer from '@/app/components/Footer';
import BookCard from '@/app/components/BookCard';
import FilterPills from '@/app/components/FilterPills';
import AddBookModal from '@/app/components/AddBookModal';
import EditBookModal from '@/app/components/EditBookModal';
import NewIssueModal from '@/app/components/NewIssueModal';
import { useAuth } from '@/app/context/AuthContext';
import { bookSelect, mapBookRowToBook, supabase, returnBookByBookId, type BookRow } from '@/app/lib/supabase';
import type { Book } from '@/app/lib/types';

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function StatCard({ label, value, icon: Icon, accent }: {
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

function MobileSearchBar({ searchQuery, onSearchChange, onClose }: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
        onChange={(event) => onSearchChange(event.target.value)}
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

function BookGridSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading book catalog">
      <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading catalog…
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="aspect-[2/3] animate-pulse bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-slate-700/70" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-700/70" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CatalogPage() {
  const { isAdmin } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState('catalog');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [issuingBook, setIssuingBook] = useState<Book | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Pagination state
  const ITEMS_PER_PAGE = 24;
  const [currentPage, setCurrentPage] = useState(1);

  const loadBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('books')
      .select(bookSelect)
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      return;
    }

    try {
      setBooks(((data ?? []) as unknown as BookRow[]).map(mapBookRowToBook));
      setLoadError(null);
    } catch (mappingError) {
      setLoadError(mappingError instanceof Error ? mappingError.message : 'Unable to map the catalog data.');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitial() {
      const { data, error } = await supabase
        .from('books')
        .select(bookSelect)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setBooks([]);
        setLoadError(error.message);
        setIsLoading(false);
        return;
      }

      try {
        setBooks(((data ?? []) as unknown as BookRow[]).map(mapBookRowToBook));
      } catch (mappingError) {
        setBooks([]);
        setLoadError(mappingError instanceof Error ? mappingError.message : 'Unable to map the catalog data.');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const genres = useMemo(
    () => Array.from(new Set(books.flatMap((book) => book.genres))).sort((a, b) => a.localeCompare(b)),
    [books],
  );

  const effectiveGenre = activeGenre !== 'All' && !genres.includes(activeGenre) ? 'All' : activeGenre;

  // Reset page to 1 whenever search query or genre filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, effectiveGenre]);

  const filteredBooks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return books.filter((book) => {
      const matchesGenre =
        effectiveGenre === 'All' ||
        book.genres?.some((g) => g.toLowerCase() === effectiveGenre.toLowerCase());
      if (!query) return matchesGenre;

      const matchesTitle = book.title?.toLowerCase().includes(query);
      const matchesAuthor = book.authors?.some((author) => author.toLowerCase().includes(query));
      const matchesIsbn = book.isbn?.toLowerCase().includes(query);
      const matchesSubtitle = book.subtitle?.toLowerCase().includes(query);

      return matchesGenre && (matchesTitle || matchesAuthor || matchesIsbn || matchesSubtitle);
    });
  }, [effectiveGenre, books, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBooks, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stats = useMemo(() => ({
    total: books.reduce((total, book) => total + book.copies, 0),
    available: books.filter((book) => book.availability === 'available').length,
    issued: books.filter((book) => book.availability === 'issued').length,
    genres: genres.length,
  }), [books, genres]);

  const handleIssueBook = useCallback(async (book: Book) => {
    if (book.availability === 'available') {
      setIssuingBook(book);
    } else {
      const confirmed = window.confirm(
        `Confirm return of "${book.title}" to available catalog inventory?`
      );
      if (!confirmed) return;

      try {
        await returnBookByBookId(book.id);
        await loadBooks();
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to return the book.');
      }
    }
  }, [loadBooks]);

  const handleDeleteBook = useCallback(async (bookId: string) => {
    setBooks((currentBooks) => currentBooks.filter((book) => book.id !== bookId));
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) {
      setLoadError(error.message);
      void loadBooks();
    }
  }, [loadBooks]);

  const handleEditBook = useCallback((book: Book) => {
    setEditingBook(book);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(document.documentElement.classList.contains('dark'))}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {mobileSearchOpen && (
          <MobileSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={() => setMobileSearchOpen(false)}
          />
        )}

        <main id="main-content" className="flex-1 px-4 md:px-6 py-5 pb-24 md:pb-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Book Catalog</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isLoading ? 'Loading books…' : `${filteredBooks.length} of ${books.length} books`}
              </p>
            </div>
            {isAdmin && (
              <button
                id="add-book-desktop-btn"
                onClick={() => setAddModalOpen(true)}
                aria-label="Add a new book"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                <Plus className="w-4 h-4" />
                Add Book
              </button>
            )}
          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Volumes" value={stats.total.toLocaleString()} icon={BookMarked} accent="bg-violet-500" />
            <StatCard label="Available" value={stats.available} icon={BarChart3} accent="bg-emerald-500" />
            <StatCard label="Issued" value={stats.issued} icon={TrendingUp} accent="bg-amber-500" />
            <StatCard label="Genres" value={stats.genres} icon={Users2} accent="bg-blue-500" />
          </div>

          <FilterPills genres={genres} activeGenre={effectiveGenre} onGenreChange={setActiveGenre} />

          <button
            id="mobile-search-trigger"
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-400 shadow-sm"
            aria-label="Open search"
          >
            <Search className="w-4 h-4" />
            Search by Title, Author, ISBN…
          </button>

          {loadError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <span>Could not load the catalog: {loadError}</span>
              <button
                type="button"
                onClick={() => void loadBooks()}
                className="rounded-md px-2 py-1 font-semibold hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <BookGridSkeleton />
          ) : filteredBooks.length > 0 ? (
            <>
              <section aria-label="Book catalog grid">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {paginatedBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onIssue={(selectedBook) => { void handleIssueBook(selectedBook); }}
                      onEdit={handleEditBook}
                      onDelete={(bookId) => { void handleDeleteBook(bookId); }}
                    />
                  ))}
                </div>
              </section>

              {/* Pagination Controls UI */}
              {totalPages > 1 && (
                <div className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredBooks.length)}</span> of{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredBooks.length}</span> books
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                      className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-xs font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </button>

                    {/* Numerical page buttons */}
                    <div className="flex items-center gap-1">
                      {generatePageNumbers(currentPage, totalPages).map((pageNum, idx) =>
                        pageNum === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400 select-none">
                            …
                          </span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum as number)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                              currentPage === pageNum
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                      className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-xs font-medium"
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookMarked className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No books found</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try changing your search or filters.</p>
            </div>
          )}
        </main>

        <Footer />
      </div>

      {isAdmin && (
        <button
          id="add-book-fab"
          onClick={() => setAddModalOpen(true)}
          aria-label="Add a new book"
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-full shadow-lg shadow-violet-600/40 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <BottomNav activeNav={activeNav} onNavChange={setActiveNav} />

      <AddBookModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onBookCreated={loadBooks}
        existingGenres={genres}
      />

      <EditBookModal
        isOpen={Boolean(editingBook)}
        book={editingBook}
        onClose={() => setEditingBook(null)}
        onBookUpdated={loadBooks}
        existingGenres={genres}
      />

      <NewIssueModal
        isOpen={Boolean(issuingBook)}
        onClose={() => setIssuingBook(null)}
        onIssueCreated={async () => {
          await loadBooks();
          setIssuingBook(null);
        }}
        preselectedBookId={issuingBook?.id}
      />
    </div>
  );
}

