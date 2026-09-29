'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Database,
  Download,
  CloudCheck,
  CheckCircle2,
  ShieldCheck,
  Save,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Lock,
} from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import { useAuth } from '@/app/context/AuthContext';
import { supabase, bookSelect, mapBookRowToBook, type BookRow, fetchMembers, fetchBookIssues } from '@/app/lib/supabase';

export default function SettingsPage() {
  const { isAdmin, openLoginModal } = useAuth();
  // Circulation settings initialized lazily from localStorage
  const [loanDuration, setLoanDuration] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('libstack_loan_duration') || '14';
    }
    return '14';
  });

  const [maxLoans, setMaxLoans] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('libstack_max_loans') || '5';
    }
    return '5';
  });

  const [allowOverdueBorrowing, setAllowOverdueBorrowing] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('libstack_allow_overdue') === 'true';
    }
    return false;
  });

  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Connectivity status
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  // Export states
  const [exportingCategory, setExportingCategory] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('libstack_loan_duration', loanDuration);
    localStorage.setItem('libstack_max_loans', maxLoans);
    localStorage.setItem('libstack_allow_overdue', String(allowOverdueBorrowing));
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  const testSupabasePing = useCallback(async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from('books').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      if (error) {
        setSupabaseConnected(false);
      } else {
        setSupabaseConnected(true);
        setPingLatency(latency);
      }
    } catch {
      setSupabaseConnected(false);
    } finally {
      setIsPinging(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkInitialPing() {
      const start = performance.now();
      try {
        const { error } = await supabase.from('books').select('id').limit(1);
        const latency = Math.round(performance.now() - start);
        if (!isMounted) return;
        if (error) {
          setSupabaseConnected(false);
        } else {
          setSupabaseConnected(true);
          setPingLatency(latency);
        }
      } catch {
        if (isMounted) setSupabaseConnected(false);
      }
    }

    void checkInitialPing();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to trigger browser download
  const triggerDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportBooksJSON = async () => {
    setExportingCategory('books-json');
    try {
      const { data } = await supabase.from('books').select(bookSelect);
      const mapped = ((data ?? []) as unknown as BookRow[]).map(mapBookRowToBook);
      triggerDownload(
        JSON.stringify(mapped, null, 2),
        `libstack_books_${new Date().toISOString().split('T')[0]}.json`,
        'application/json',
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCategory(null);
    }
  };

  const exportBooksCSV = async () => {
    setExportingCategory('books-csv');
    try {
      const { data } = await supabase.from('books').select(bookSelect);
      const mapped = ((data ?? []) as unknown as BookRow[]).map(mapBookRowToBook);
      const headers = ['ID', 'Title', 'Subtitle', 'Authors', 'Genres', 'Language', 'Availability', 'Copies', 'PublishedYear', 'Shelf', 'Row', 'Slot'];
      const rows = mapped.map((b) => [
        `"${b.id}"`,
        `"${b.title.replace(/"/g, '""')}"`,
        `"${(b.subtitle ?? '').replace(/"/g, '""')}"`,
        `"${b.authors.join('; ')}"`,
        `"${b.genres.join('; ')}"`,
        `"${b.language}"`,
        `"${b.availability}"`,
        b.copies,
        b.publishedYear,
        `"${b.location.shelf}"`,
        `"${b.location.row}"`,
        `"${b.location.slot}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      triggerDownload(csv, `libstack_books_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCategory(null);
    }
  };

  const exportMembersJSON = async () => {
    setExportingCategory('members-json');
    try {
      const members = await fetchMembers();
      triggerDownload(
        JSON.stringify(members, null, 2),
        `libstack_members_${new Date().toISOString().split('T')[0]}.json`,
        'application/json',
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCategory(null);
    }
  };

  const exportMembersCSV = async () => {
    setExportingCategory('members-csv');
    try {
      const members = await fetchMembers();
      const headers = ['ID', 'MemberCode', 'FullName', 'Email', 'Phone', 'Status', 'ActiveLoansCount', 'CreatedAt'];
      const rows = members.map((m) => [
        `"${m.id}"`,
        `"${m.memberCode}"`,
        `"${m.fullName.replace(/"/g, '""')}"`,
        `"${m.email ?? ''}"`,
        `"${m.phone ?? ''}"`,
        `"${m.status}"`,
        m.activeLoansCount ?? 0,
        `"${m.createdAt}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      triggerDownload(csv, `libstack_members_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCategory(null);
    }
  };

  const exportLoansJSON = async () => {
    setExportingCategory('loans-json');
    try {
      const loans = await fetchBookIssues();
      triggerDownload(
        JSON.stringify(loans, null, 2),
        `libstack_circulation_${new Date().toISOString().split('T')[0]}.json`,
        'application/json',
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCategory(null);
    }
  };

  const copyMigrationNote = () => {
    navigator.clipboard.writeText('Run the file supabase/schema.sql in your Supabase SQL Editor.');
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <AppLayout title="System Settings &amp; Data Management">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          System Settings &amp; Connectivity
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure circulation policies, monitor Supabase cloud database status, and export backups.
        </p>
      </div>

      {/* Guest Restricted Access Lock Banner */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold">Restricted Access</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Please log in as Librarian to adjust system settings and policies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLoginModal('Please log in as Librarian to adjust system settings.')}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            Librarian Login
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Circulation Rules Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Circulation &amp; Lending Policies
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control loan periods and borrowing limits applied during issue workflow.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="loan-duration" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Default Loan Duration
                  </label>
                  <select
                    id="loan-duration"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100"
                  >
                    <option value="7">7 Days (1 Week - High Demand)</option>
                    <option value="14">14 Days (2 Weeks - Standard)</option>
                    <option value="21">21 Days (3 Weeks)</option>
                    <option value="30">30 Days (1 Month - Extended)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="max-loans" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Max Concurrent Loans per Member
                  </label>
                  <select
                    id="max-loans"
                    value={maxLoans}
                    onChange={(e) => setMaxLoans(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-900 dark:text-slate-100"
                  >
                    <option value="2">2 Books Maximum</option>
                    <option value="3">3 Books Maximum</option>
                    <option value="5">5 Books Maximum (Recommended)</option>
                    <option value="10">10 Books Maximum</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Allow Borrowing with Overdue Items
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    When disabled, patrons with unreturned overdue books cannot check out new titles.
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="allow-overdue-toggle"
                  checked={allowOverdueBorrowing}
                  onChange={(e) => setAllowOverdueBorrowing(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {savedSettingsNotice ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Preferences saved successfully!
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Stored in browser local preferences.</span>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-violet-600/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Policies
                </button>
              </div>
            </form>
          </div>

          {/* Backup & Data Export Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Data Backup &amp; Export
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Download snapshots of catalog books, patron accounts, and circulation records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Books Export */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">Book Catalog</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Metadata, tags &amp; shelf placements</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void exportBooksJSON()}
                    disabled={exportingCategory !== null}
                    className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-violet-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-violet-500" />
                    JSON
                  </button>
                  <button
                    onClick={() => void exportBooksCSV()}
                    disabled={exportingCategory !== null}
                    className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-violet-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    CSV
                  </button>
                </div>
              </div>

              {/* Members Export */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">Patron Members</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Member codes, contact &amp; status</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void exportMembersJSON()}
                    disabled={exportingCategory !== null}
                    className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-violet-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-violet-500" />
                    JSON
                  </button>
                  <button
                    onClick={() => void exportMembersCSV()}
                    disabled={exportingCategory !== null}
                    className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-violet-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    CSV
                  </button>
                </div>
              </div>

              {/* Circulation History Export */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">Circulation Records</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Full loan and return transactions</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void exportLoansJSON()}
                    disabled={exportingCategory !== null}
                    className="w-full py-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-violet-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-violet-500" />
                    Export Full JSON Backup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Supabase Cloud Connectivity */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
                  <CloudCheck className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Supabase Connectivity
                </h2>
              </div>
              <button
                onClick={() => void testSupabasePing()}
                disabled={isPinging}
                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors"
                title="Ping Supabase"
              >
                <RefreshCw className={isPinging ? 'w-4 h-4 animate-spin text-violet-500' : 'w-4 h-4'} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Connection Status:</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {supabaseConnected === false ? 'Error connecting' : 'Connected'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Database Region:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">ap-northeast-1 (Tokyo)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Health Ping Latency:</span>
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                  {pingLatency !== null ? `${pingLatency} ms` : 'Testing…'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-700/60 pt-2.5">
                <span className="text-slate-500 dark:text-slate-400">Auth &amp; RLS Mode:</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                  Public Anon (Dev)
                </span>
              </div>
            </div>

            {/* Schema migration reference card */}
            <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-900 dark:text-violet-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  Schema Migration
                </span>
                <button
                  onClick={copyMigrationNote}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  {copiedSchema ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedSchema ? 'Copied!' : 'Copy Info'}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Database tables (<code className="font-mono text-violet-600 dark:text-violet-300">books</code>, <code className="font-mono text-violet-600 dark:text-violet-300">members</code>, <code className="font-mono text-violet-600 dark:text-violet-300">book_issues</code>) are defined in <code className="font-mono text-violet-600 dark:text-violet-300">supabase/schema.sql</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
