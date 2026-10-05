'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import Navbar from '@/app/components/Navbar';
import BottomNav from '@/app/components/BottomNav';
import Footer from '@/app/components/Footer';
import AiAssistantModal from '@/app/components/AiAssistantModal';
import BookDetailsModal from '@/app/components/BookDetailsModal';
import { fetchBookById } from '@/app/lib/supabase';
import type { Book } from '@/app/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
}

export default function AppLayout({
  children,
  title,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // AI Assistant book details modal wiring
  const [selectedBookForModal, setSelectedBookForModal] = useState<Book | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const handleSelectBookFromAi = async (bookId: string) => {
    const book = await fetchBookById(bookId);
    if (book) {
      setSelectedBookForModal(book);
      setDetailsModalOpen(true);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(document.documentElement.classList.contains('dark'))}
          title={title}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        <main id="main-content" className="flex-1 px-4 md:px-6 py-5 pb-12 md:pb-8 space-y-6">
          {children}
        </main>

        <Footer />
      </div>

      <BottomNav />

      {/* Floating AI Assistant */}
      <AiAssistantModal onSelectBook={handleSelectBookFromAi} />

      {/* Global Book Details & Borrow Modal */}
      <BookDetailsModal
        book={selectedBookForModal}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />
    </div>
  );
}



