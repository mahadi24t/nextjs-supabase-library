import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LibStack — Library Management System',
  description:
    'LibStack is a modern, minimalist library management system for cataloging books, managing members, and tracking issues and returns.',
  keywords: ['library', 'book catalog', 'library management', 'libstack'],
  openGraph: {
    title: 'LibStack — Library Management System',
    description: 'Modern library management for the digital age.',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
