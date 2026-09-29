'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Plus, Tag, LoaderCircle, Camera, CheckCircle2, Trash2 } from 'lucide-react';
import { createBook, updateBook } from '@/app/lib/supabase';
import { cn } from '@/app/lib/utils';
import type { AddBookFormData, Book } from '@/app/lib/types';

/**
 * Sanitizes image URLs copied from Google Images or redirect services.
 * Extracts direct image URLs from query params like imgurl, q, url.
 */
export function sanitizeCoverUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    // Check Google Image search result redirects:
    if (hostname.includes('google.') || hostname.includes('googleusercontent.')) {
      const imgurl = parsed.searchParams.get('imgurl');
      if (imgurl) {
        try {
          const decoded = decodeURIComponent(imgurl);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            return decoded;
          }
        } catch {
          // ignore parsing error
        }
      }

      const q = parsed.searchParams.get('q');
      if (q) {
        try {
          const decoded = decodeURIComponent(q);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            return decoded;
          }
        } catch {
          // ignore parsing error
        }
      }

      const urlParam = parsed.searchParams.get('url');
      if (urlParam) {
        try {
          const decoded = decodeURIComponent(urlParam);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            return decoded;
          }
        } catch {
          // ignore parsing error
        }
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

/**
 * Compresses an image file from camera/gallery into an optimized Web-friendly Base64 data URL.
 * Keeps dimensions within max 500x750 with 80% JPEG quality (~30-60 KB).
 */
export async function compressImageFile(file: File, maxWidth = 500, maxHeight = 750, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        reject(new Error('Empty file content'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

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

export interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookCreated?: () => Promise<void> | void;
  onBookSaved?: () => Promise<void> | void;
  existingGenres: string[];
  bookToEdit?: Book | null;
}

function BookModalContent({
  onClose,
  onBookCreated,
  onBookSaved,
  existingGenres,
  bookToEdit,
}: Omit<AddBookModalProps, 'isOpen'>) {
  const isEditing = Boolean(bookToEdit);

  const initialFormData = useMemo<AddBookFormData>(() => {
    if (bookToEdit) {
      return {
        title: bookToEdit.title,
        subtitle: bookToEdit.subtitle ?? '',
        authors: [...bookToEdit.authors],
        language: bookToEdit.language,
        isTranslated: bookToEdit.isTranslated,
        originalLanguage: bookToEdit.originalLanguage ?? 'English',
        genres: [...bookToEdit.genres],
        shelf: bookToEdit.location.shelf,
        row: bookToEdit.location.row,
        slot: bookToEdit.location.slot,
        copies: bookToEdit.copies,
        publishedYear: bookToEdit.publishedYear,
        coverUrl: bookToEdit.coverUrl ?? '',
      };
    }
    return INITIAL_FORM;
  }, [bookToEdit]);

  const [form, setForm] = useState<AddBookFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cover image upload & sanitization state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [urlSanitizedHint, setUrlSanitizedHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Author tag input
  const [authorInput, setAuthorInput] = useState('');

  // Genre state
  const [genreSearch, setGenreSearch] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [customGenres, setCustomGenres] = useState<string[]>([]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setSubmitError(null);
    try {
      const compressedDataUrl = await compressImageFile(file);
      setForm((f) => ({ ...f, coverUrl: compressedDataUrl }));
      setUrlSanitizedHint(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to process image file');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCoverUrlChange = (value: string) => {
    const sanitized = sanitizeCoverUrl(value);
    const wasCleaned = sanitized !== value && sanitized.length > 0;
    setForm((f) => ({ ...f, coverUrl: sanitized }));
    setUrlSanitizedHint(wasCleaned);
  };


  const allGenres = useMemo(() => {
    return Array.from(new Set([...existingGenres, ...customGenres])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [existingGenres, customGenres]);

  const availableLanguages = useMemo(() => {
    const list = [...LANGUAGES];
    if (form.language && !list.includes(form.language)) list.push(form.language);
    if (form.originalLanguage && !list.includes(form.originalLanguage)) list.push(form.originalLanguage);
    return list;
  }, [form.language, form.originalLanguage]);

  // Focus on title input when modal mounts
  useEffect(() => {
    const timeout = setTimeout(() => firstFocusRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  // Author tag management
  const addAuthor = useCallback(() => {
    const trimmed = authorInput.trim();
    if (trimmed) {
      const lower = trimmed.toLocaleLowerCase();
      if (!form.authors.some((a) => a.toLocaleLowerCase() === lower)) {
        setForm((f) => ({ ...f, authors: [...f.authors, trimmed] }));
      }
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
      !form.genres.includes(g),
  );

  const addGenre = useCallback(
    (genre: string) => {
      const trimmed = genre.trim();
      if (!trimmed) return;
      if (!allGenres.includes(trimmed)) {
        setCustomGenres((prev) => [...prev, trimmed]);
      }
      if (!form.genres.includes(trimmed)) {
        setForm((f) => ({ ...f, genres: [...f.genres, trimmed] }));
      }
      setGenreSearch('');
      setShowGenreDropdown(false);
    },
    [allGenres, form.genres],
  );

  const removeGenre = useCallback((genre: string) => {
    setForm((f) => ({ ...f, genres: f.genres.filter((g) => g !== genre) }));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // UX FIX: Automatically trim and commit uncommitted text remaining in author input
    const pendingAuthor = authorInput.trim();
    let authorsToSave = [...form.authors];
    if (pendingAuthor) {
      const lowerPending = pendingAuthor.toLocaleLowerCase();
      if (!authorsToSave.some((a) => a.toLocaleLowerCase() === lowerPending)) {
        authorsToSave = [...authorsToSave, pendingAuthor];
      }
    }

    const finalFormData: AddBookFormData = {
      ...form,
      authors: authorsToSave,
    };

    try {
      if (bookToEdit) {
        await updateBook(bookToEdit.id, finalFormData, bookToEdit);
      } else {
        await createBook(finalFormData);
      }

      if (onBookSaved) {
        await onBookSaved();
      }
      if (onBookCreated) {
        await onBookCreated();
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save the book.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all';

  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5';

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="book-modal-title"
    >
      <div
        className={cn(
          'w-full md:max-w-lg bg-white dark:bg-slate-800 shadow-2xl flex flex-col',
          'rounded-t-2xl md:rounded-2xl',
          'max-h-[92dvh] md:max-h-[90dvh]',
        )}
      >
        {/* Grab handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2
              id="book-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {isEditing ? 'Edit Book' : 'Add Book'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditing
                ? 'Update book metadata, placement, and copies in your catalog.'
                : 'Catalog a new volume with physical shelf placement and tags.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={isEditing ? 'Close edit book modal' : 'Close add book modal'}
            disabled={isSubmitting}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <form
          id="book-form"
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

          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {submitError}
            </p>
          )}

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
                {availableLanguages.map((lang) => (
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
                  form.isTranslated ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    form.isTranslated && 'translate-x-5',
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
                {availableLanguages.map((lang) => (
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

          {/* Cover Image Manager */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cover-url" className={labelClass}>
                Cover Image
              </label>
              {form.coverUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, coverUrl: '' }));
                    setUrlSanitizedHint(false);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>

            {/* Input row: URL or Device File */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <input
                  id="cover-url"
                  type="url"
                  placeholder="Paste direct URL (Google Image links auto-cleaned)…"
                  value={form.coverUrl}
                  onChange={(e) => handleCoverUrlChange(e.target.value)}
                  className={inputClass}
                />
              </div>

              {urlSanitizedHint && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Clean direct image URL extracted from Google Search redirect.
                </p>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="cover-file-input"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors w-full min-h-[38px] active:scale-95"
                >
                  {isUploadingImage ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin text-violet-500" />
                      Optimizing Image…
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      <span>Upload from Camera / Gallery</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Image Preview thumbnail */}
            {form.coverUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                <div className="relative w-12 h-16 rounded overflow-hidden bg-slate-900 shrink-0 border border-slate-300 dark:border-slate-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.coverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">Cover Image Ready</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                    {form.coverUrl.startsWith('data:') ? 'Optimized Device Photo (~30-50 KB)' : form.coverUrl}
                  </p>
                </div>
              </div>
            )}
          </div>

        </form>

        {/* Footer Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="submit"
            form="book-form"
            id="save-book-btn"
            disabled={!form.title.trim() || isSubmitting}
            className="flex-1 py-2.5 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                {isEditing ? 'Saving Changes…' : 'Saving…'}
              </span>
            ) : (
              isEditing ? 'Save Changes' : 'Save Book'
            )}
          </button>
          <button
            type="button"
            id="cancel-add-book-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddBookModal(props: AddBookModalProps) {
  if (!props.isOpen) return null;
  return <BookModalContent key={props.bookToEdit?.id ?? 'create'} {...props} />;
}
