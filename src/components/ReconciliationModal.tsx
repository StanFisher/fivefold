'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { formatCurrency, formatDateDisplay } from '@/lib/formatters';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentLedgerTotal: number;
  reconciliations: any[];
}

export function ReconciliationModal({
  isOpen,
  onClose,
  onSuccess,
  currentLedgerTotal,
  reconciliations,
}: ReconciliationModalProps) {
  const [bankBalance, setBankBalance] = useState<string>(currentLedgerTotal.toFixed(2));
  const [statementDate, setStatementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedBank = parseFloat(bankBalance) || 0;
  const difference = Number((parsedBank - currentLedgerTotal).toFixed(2));
  const isExactMatch = Math.abs(difference) < 0.01;

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankBalance: parsedBank,
          statementDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record reconciliation');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error recording reconciliation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bank Reconciliation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Match FiveFold ledger against bank balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleReconcile} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ledger vs Bank inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                FiveFold Ledger
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {formatCurrency(currentLedgerTotal)}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Sum of child accounts</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Bank Statement Total
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bankBalance}
                  onChange={(e) => setBankBalance(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-2 text-slate-900 dark:text-white font-mono font-semibold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">From Wealthfront balance</span>
            </div>
          </div>

          {/* Reconciliation Status Result */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isExactMatch
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isExactMatch ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              )}
              <div>
                <span className="font-semibold text-sm">
                  {isExactMatch ? 'Exact Penny Match' : 'Discrepancy Detected'}
                </span>
                <p className="text-xs opacity-80">
                  {isExactMatch
                    ? 'Ledger perfectly equals bank balance.'
                    : 'Check for unrecorded interest, deposits, or withdrawals.'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider opacity-75">Difference</span>
              <div className="text-base font-bold font-mono">
                {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
              </div>
            </div>
          </div>

          {/* Statement Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Statement Date
              </label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. End of month statement check"
              />
            </div>
          </div>

          {/* Past Reconciliation History */}
          {reconciliations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Recent Checks
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {reconciliations.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300">{formatDateDisplay(r.statementDate)}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(r.bankBalance)}</span>
                    <span
                      className={`font-semibold ${
                        r.status === 'MATCHED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {r.status === 'MATCHED' ? '✓ Balanced' : `Diff ${formatCurrency(r.difference)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Saving Check...' : 'Confirm Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
