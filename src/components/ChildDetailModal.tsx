'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, PlusCircle, MinusCircle, Sparkles, Calendar, DollarSign, User } from 'lucide-react';
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
      fetchChildTransactions(child.id);
    }
  }, [isOpen, child]);

  const fetchChildTransactions = async (childId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?childId=${childId}`);
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load child transactions', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !child) return null;

  // Compute lifetime metrics
  let totalDeposited = 0;
  let totalWithdrawn = 0;
  let totalInterest = 0;

  transactions.forEach((tx) => {
    const split = tx.splits.find((s) => s.childId === child.id);
    if (!split) return;
    if (tx.type === 'INITIAL' || tx.type === 'DEPOSIT') {
      totalDeposited += split.amount;
    } else if (tx.type === 'WITHDRAWAL') {
      totalWithdrawn += Math.abs(split.amount);
    } else if (tx.type === 'INTEREST') {
      totalInterest += split.amount;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
              style={{ backgroundColor: child.color }}
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{child.name}&apos;s Account</h2>
              <p className="text-xs text-slate-400">
                {child.percentage}% of pooled savings account ({formatCurrency(totalAccountBalance)} total)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Balance Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Current Balance
              </span>
              <div className="text-3xl font-extrabold text-white font-mono">
                {formatCurrency(child.balance || 0)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickDeposit(child.id);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickWithdraw(child.id);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Withdraw
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Lifetime Deposits
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {formatCurrency(totalDeposited)}
              </span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Lifetime Interest
              </span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                +{formatCurrency(totalInterest)}
              </span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Lifetime Withdrawals
              </span>
              <span className="text-sm font-bold text-rose-400 font-mono">
                -{formatCurrency(totalWithdrawn)}
              </span>
            </div>
          </div>

          {/* Transaction History for this child */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Transaction History
            </h3>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading activity...</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">No transactions yet</div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
                {transactions.map((tx) => {
                  const split = tx.splits.find((s) => s.childId === child.id);
                  if (!split) return null;
                  const isPositive = split.amount >= 0;

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === 'INTEREST'
                              ? 'bg-amber-500/20 text-amber-400'
                              : isPositive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tx.type === 'INTEREST' ? (
                            <Sparkles className="w-4 h-4" />
                          ) : isPositive ? (
                            <PlusCircle className="w-4 h-4" />
                          ) : (
                            <MinusCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {tx.description || tx.type}
                          </div>
                          <div className="text-xs text-slate-400">{formatDateDisplay(tx.date)}</div>
                        </div>
                      </div>

                      <div
                        className={`text-sm font-bold font-mono ${
                          tx.type === 'INTEREST'
                            ? 'text-amber-400'
                            : isPositive
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(split.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
