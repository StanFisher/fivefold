'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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
  const [statementBalance, setStatementBalance] = useState<string>(currentLedgerTotal.toFixed(2));
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedStatement = parseFloat(statementBalance) || 0;
  const difference = Number((currentLedgerTotal - parsedStatement).toFixed(2));
  const isMatch = Math.abs(difference) < 0.01 && parsedStatement > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedStatement <= 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementBalance: parsedStatement,
          date,
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bank Reconciliation</h2>
              <p className="text-xs text-slate-400">Verify FiveFold ledger vs. Wealthfront balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Balance comparison card */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                FiveFold Total (Sum of Kids)
              </span>
              <span className="text-lg font-bold text-white font-mono">
                {formatCurrency(currentLedgerTotal)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Reconciliation Status
              </span>
              <span
                className={`text-sm font-semibold flex items-center gap-1.5 ${
                  isMatch ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isMatch ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Balanced ($0.00)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" /> Discrepancy
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Form inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Actual Bank Account Balance ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={statementBalance}
                  onChange={(e) => setTotalBalanceInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-white font-mono font-semibold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Statement / Reconciliation Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Difference alert */}
          {!isMatch && parsedStatement > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span>Discrepancy Detected:</span>
                <span className="font-mono text-sm">
                  {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
                </span>
              </div>
              <p className="opacity-80">
                {difference > 0
                  ? 'FiveFold has more recorded funds than the bank statement. Check if a withdrawal is missing.'
                  : 'The bank has more funds than FiveFold. Check if monthly interest has posted or a deposit is missing.'}
              </p>
            </div>
          )}

          {/* Historical reconciliations */}
          {reconciliations && reconciliations.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Recent Reconciliations
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {reconciliations.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 text-xs text-slate-300"
                  >
                    <div>
                      <span className="font-medium text-white">{formatDateDisplay(r.date)}</span>
                      <span className="text-slate-400 ml-2 font-mono">
                        {formatCurrency(r.statementBalance)}
                      </span>
                    </div>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        r.status === 'MATCHED'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || parsedStatement <= 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Recording...' : 'Save Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  function setTotalBalanceInput(val: string) {
    setStatementBalance(val);
  }
}
