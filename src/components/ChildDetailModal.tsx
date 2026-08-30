'use client';

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, MinusCircle, History, Sparkles } from 'lucide-react';
import { Child, Transaction } from '@/lib/types';
import { formatCurrency, formatDateDisplay } from '@/lib/formatters';

interface ChildDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child | null;
  totalAccountBalance: number;
  onQuickDeposit: (childId: number) => void;
  onQuickWithdraw: (childId: number) => void;
}

export function ChildDetailModal({
  isOpen,
  onClose,
  child,
  totalAccountBalance,
  onQuickDeposit,
  onQuickWithdraw,
}: ChildDetailModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && child) {
      setLoading(true);
      fetch(`/api/transactions?childId=${child.id}`)
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, child]);

  if (!isOpen || !child) return null;

  const totalInterestEarned = transactions
    .filter((tx) => tx.type === 'INTEREST')
    .reduce((sum, tx) => {
      const split = tx.splits.find((s) => s.childId === child.id);
      return sum + (split ? split.amount : 0);
    }, 0);

  const totalDeposits = transactions
    .filter((tx) => tx.type === 'DEPOSIT' || tx.type === 'INITIAL')
    .reduce((sum, tx) => {
      const split = tx.splits.find((s) => s.childId === child.id);
      return sum + (split ? split.amount : 0);
    }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
              style={{ backgroundColor: child.color }}
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{child.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  {child.percentage}% of total
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Child Savings Sub-Account</span>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Current Balance
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(child.balance || 0)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Total Interest
              </span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                +{formatCurrency(totalInterestEarned)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
                <PlusCircle className="w-3.5 h-3.5" /> Contributions
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalDeposits)}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onQuickDeposit(child.id);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Deposit for {child.name}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onQuickWithdraw(child.id);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <MinusCircle className="w-4 h-4" />
              Withdraw for {child.name}
            </button>
          </div>

          {/* Transaction History for this child */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> {child.name}&apos;s Ledger History
            </h3>

            {loading ? (
              <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">Loading activity...</div>
            ) : transactions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                No activity recorded yet for {child.name}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {transactions.map((tx) => {
                  const split = tx.splits.find((s) => s.childId === child.id);
                  const amount = split ? split.amount : 0;
                  const isPositive = amount >= 0;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {tx.description || tx.type}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {tx.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateDisplay(tx.date)}</span>
                      </div>

                      <div
                        className={`text-sm font-bold font-mono ${
                          tx.type === 'INTEREST'
                            ? 'text-amber-600 dark:text-amber-400'
                            : isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
