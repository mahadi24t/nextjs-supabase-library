'use client';

import AddBookModal from '@/app/components/AddBookModal';
import type { Book } from '@/app/lib/types';

export interface EditBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookUpdated: () => Promise<void> | void;
  existingGenres: string[];
  book: Book | null;
}

export default function EditBookModal({
  isOpen,
  onClose,
  onBookUpdated,
  existingGenres,
  book,
}: EditBookModalProps) {
  return (
    <AddBookModal
      isOpen={isOpen}
      onClose={onClose}
      onBookSaved={onBookUpdated}
      existingGenres={existingGenres}
      bookToEdit={book}
    />
  );
}
