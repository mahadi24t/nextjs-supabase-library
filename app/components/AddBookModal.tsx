'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Plus, Tag } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import type { AddBookFormData } from '@/app/lib/types';

const INITIAL_FORM: AddBookFormData = {
  title: '',
  subtitle: '',
  authors: [],
  language: 'English',
  isTranslated: false,
  originalLanguage: 'English',
  genres: [],
  shelf: '',
  row: '',
  slot: '',
  copies: 1,
  publishedYear: new Date().getFullYear(),
  coverUrl: '',
};

const LANGUAGES = ['English', 'Bengali', 'Arabic', 'French', 'German', 'Spanish', 'Urdu'];

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddBookFormData) => void;
  existingGenres: string[];
}

export default function AddBookModal({
  isOpen,
  onClose,
  onSave,
  existingGenres,
}: AddBookModalProps) {
  const [form, setForm] = useState<AddBookFormData>(INITIAL_FORM);

  // Author tag input
  const [authorInput, setAuthorInput] = useState('');

  // Genre state
  const [genreSearch, setGenreSearch] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [allGenres, setAllGenres] = useState<string[]>(existingGenres);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);

  // Sync external genres
  useEffect(() => {
    setAllGenres(existingGenres);
  }, [existingGenres]);

  // Focus trap + reset
  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setAuthorInput('');
      setGenreSearch('');
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Author tag management
  const addAuthor = useCallback(() => {
    const trimmed = authorInput.trim();
    if (trimmed && !form.authors.includes(trimmed)) {
      setForm((f) => ({ ...f, authors: [...f.authors, trimmed] }));
    }
    setAuthorInput('');
  }, [authorInput, form.authors]);

  const removeAuthor = useCallback((name: string) => {
    setForm((f) => ({ ...f, authors: f.authors.filter((a) => a !== name) }));
  }, []);

  // Genre management
  const filteredGenres = allGenres.filter(
    (g) =>
      g.toLowerCase().includes(genreSearch.toLowerCase()) &&
      !form.genres.includes(g)
  );

  const addGenre = useCallback(
    (genre: string) => {
      const trimmed = genre.trim();
      if (!trimmed) return;
      if (!allGenres.includes(trimmed)) {
        setAllGenres((prev) => [...prev, trimmed]);
      }
      if (!form.genres.includes(trimmed)) {
        setForm((f) => ({ ...f, genres: [...f.genres, trimmed] }));
      }
      setGenreSearch('');
      setShowGenreDropdown(false);
    },
    [allGenres, form.genres]
  );

  const removeGenre = useCallback((genre: string) => {
    setForm((f) => ({ ...f, genres: f.genres.filter((g) => g !== genre) }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all';

  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5';

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="add-book-modal-title"
    >
      {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
      <div
        className={cn(
          'w-full md:max-w-lg bg-white dark:bg-slate-800 shadow-2xl flex flex-col',
          'rounded-t-2xl md:rounded-2xl',
          'max-h-[92dvh] md:max-h-[90dvh]'
        )}
      >
        {/* Grab handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2
            id="add-book-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            Add Book
          </h2>
          <button
            onClick={onClose}
            aria-label="Close add book modal"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto p-5 flex-1"
          noValidate
        >
          {/* Title */}
          <div>
            <label htmlFor="book-title" className={labelClass}>
              Book Title <span className="text-red-500">*</span>
            </label>
            <input
              id="book-title"
              ref={firstFocusRef}
              type="text"
              placeholder="Book Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className={inputClass}
            />
          </div>

          {/* Subtitle */}
          <div>
            <label htmlFor="book-subtitle" className={labelClass}>
              Subtitle
            </label>
            <input
              id="book-subtitle"
              type="text"
              placeholder="Book Subtitle (optional)"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* Author Tag Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="author-input" className={labelClass.replace('mb-1.5', '')}>
                Author Tags
              </label>
              <span className="text-[10px] text-slate-400">Type name &amp; press Enter</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all min-h-[42px]">
              {form.authors.map((author) => (
                <span
                  key={author}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                >
                  <Tag className="w-2.5 h-2.5" aria-hidden="true" />
                  {author}
                  <button
                    type="button"
                    onClick={() => removeAuthor(author)}
                    aria-label={`Remove author ${author}`}
                    className="ml-0.5 hover:text-red-500 transition-colors focus-visible:outline-none"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                id="author-input"
                type="text"
                placeholder={form.authors.length === 0 ? 'Authors…' : ''}
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAuthor();
                  }
                }}
                className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Language & Translation */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="book-language" className={labelClass}>
                Language
              </label>
              <select
                id="book-language"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className={inputClass}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center gap-1 pb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Translated</span>
              <button
                type="button"
                role="switch"
                id="translation-toggle"
                aria-checked={form.isTranslated}
                onClick={() => setForm((f) => ({ ...f, isTranslated: !f.isTranslated }))}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                  form.isTranslated ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    form.isTranslated && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Original Language (if translated) */}
          {form.isTranslated && (
            <div>
              <label htmlFor="original-language" className={labelClass}>
                Original Language
              </label>
              <select
                id="original-language"
                value={form.originalLanguage}
                onChange={(e) => setForm((f) => ({ ...f, originalLanguage: e.target.value }))}
                className={inputClass}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Genre Selector */}
          <div>
            <label htmlFor="genre-search" className={labelClass}>
              Genre Tags
            </label>
            {/* Selected genres */}
            {form.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.genres.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                  >
                    {g}
                    <button
                      type="button"
                      onClick={() => removeGenre(g)}
                      aria-label={`Remove genre ${g}`}
                      className="hover:text-red-500 transition-colors focus-visible:outline-none"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Search + dropdown */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="genre-search"
                ref={genreInputRef}
                type="text"
                placeholder="Search or create genre…"
                value={genreSearch}
                onChange={(e) => {
                  setGenreSearch(e.target.value);
                  setShowGenreDropdown(true);
                }}
                onFocus={() => setShowGenreDropdown(true)}
                onBlur={() => setTimeout(() => setShowGenreDropdown(false), 150)}
                className={cn(inputClass, 'pl-9')}
                aria-autocomplete="list"
                aria-expanded={showGenreDropdown}
                role="combobox"
                aria-haspopup="listbox"
                aria-controls="genre-listbox"
              />
              {showGenreDropdown && (
                <div
                  id="genre-listbox"
                  role="listbox"
                  aria-label="Genre suggestions"
                  className="absolute z-10 mt-1 w-full rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-lg overflow-hidden"
                >
                  {filteredGenres.length > 0 && (
                    <ul>
                      {filteredGenres.slice(0, 6).map((g) => (
                        <li key={g}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseDown={() => addGenre(g)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            {g}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {genreSearch.trim() && !allGenres.includes(genreSearch.trim()) && (
                    <button
                      type="button"
                      onMouseDown={() => addGenre(genreSearch)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-600 border-t border-slate-100 dark:border-slate-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Create &quot;{genreSearch.trim()}&quot;
                    </button>
                  )}
                  {filteredGenres.length === 0 && !genreSearch.trim() && (
                    <p className="px-3 py-2 text-sm text-slate-400">No genres found</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Physical Placement */}
          <div>
            <label className={labelClass}>Physical Placement</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="shelf" className="sr-only">Shelf</label>
                <input
                  id="shelf"
                  type="text"
                  placeholder="Shelf"
                  value={form.shelf}
                  onChange={(e) => setForm((f) => ({ ...f, shelf: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="row" className="sr-only">Row</label>
                <input
                  id="row"
                  type="text"
                  placeholder="Row"
                  value={form.row}
                  onChange={(e) => setForm((f) => ({ ...f, row: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="slot" className="sr-only">Slot</label>
                <input
                  id="slot"
                  type="text"
                  placeholder="Slot"
                  value={form.slot}
                  onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Copies & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="copies" className={labelClass}>
                Copies / Quantity
              </label>
              <input
                id="copies"
                type="number"
                min={1}
                max={9999}
                value={form.copies}
                onChange={(e) =>
                  setForm((f) => ({ ...f, copies: Math.max(1, parseInt(e.target.value) || 1) }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="published-year" className={labelClass}>
                Edition / Published Year
              </label>
              <input
                id="published-year"
                type="number"
                min={1000}
                max={new Date().getFullYear()}
                value={form.publishedYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, publishedYear: parseInt(e.target.value) || f.publishedYear }))
                }
                className={inputClass}
              />
            </div>
          </div>

          {/* Cover URL */}
          <div>
            <label htmlFor="cover-url" className={labelClass}>
              Cover Image URL
            </label>
            <input
              id="cover-url"
              type="url"
              placeholder="https://example.com/cover.jpg"
              value={form.coverUrl}
              onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
              className={inputClass}
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="submit"
            id="save-book-btn"
            onClick={handleSubmit}
            disabled={!form.title.trim()}
            className="flex-1 py-2.5 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 min-h-[44px]"
          >
            Save Book
          </button>
          <button
            type="button"
            id="cancel-add-book-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
