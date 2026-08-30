'use client';

import React, { useState } from 'react';
import { Transaction, Child } from '@/lib/types';
import { formatCurrency, formatDateDisplay } from '@/lib/formatters';
import { PlusCircle, MinusCircle, Sparkles, Trash2, Filter, DollarSign, Layers } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  childrenList: Child[];
  onDeleteTransaction: (id: number) => void;
  onSelectChild: (childId: number) => void;
}

export function TransactionList({
  transactions,
  childrenList,
  onDeleteTransaction,
  onSelectChild,
}: TransactionListProps) {
  const [filterChildId, setFilterChildId] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterChildId !== 'all') {
      const hasChild = tx.splits.some((s) => s.childId === filterChildId);
      if (!hasChild) return false;
    }
    return true;
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this transaction? Balances will be recalculated.')) {
      setDeletingId(id);
      try {
        await onDeleteTransaction(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Transaction Ledger
          </h2>
          <p className="text-xs text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'} recorded
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Child filter */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterChildId}
              onChange={(e) =>
                setFilterChildId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
              }
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Children
              </option>
              {childrenList.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Types
              </option>
              <option value="DEPOSIT" className="bg-slate-900 text-slate-200">
                Deposits
              </option>
              <option value="WITHDRAWAL" className="bg-slate-900 text-slate-200">
                Withdrawals
              </option>
              <option value="INTEREST" className="bg-slate-900 text-slate-200">
                Monthly Interest
              </option>
              <option value="INITIAL" className="bg-slate-900 text-slate-200">
                Initial Setup
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No transactions match your current filters.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {filtered.map((tx) => {
            const isInterest = tx.type === 'INTEREST';
            const isDeposit = tx.type === 'DEPOSIT' || tx.type === 'INITIAL';
            const isWithdrawal = tx.type === 'WITHDRAWAL';

            return (
              <div
                key={tx.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition-colors group"
              >
                {/* Left: icon & details */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isInterest
                        ? 'bg-amber-500/20 text-amber-400'
                        : isDeposit
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isInterest ? (
                      <Sparkles className="w-4 h-4" />
                    ) : isDeposit ? (
                      <PlusCircle className="w-4 h-4" />
                    ) : (
                      <MinusCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {tx.description || tx.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isInterest
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                            : isDeposit
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 block mb-1.5">
                      {formatDateDisplay(tx.date)}
                    </span>

                    {/* Split pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tx.splits.map((s) => (
                        <button
                          key={s.id || s.childId}
                          type="button"
                          onClick={() => onSelectChild(s.childId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 transition-colors"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: s.childColor || '#6366f1' }}
                          />
                          <span>{s.childName}:</span>
                          <span
                            className={`font-mono font-medium ${
                              s.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {s.amount >= 0 ? '+' : ''}
                            {formatCurrency(s.amount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Total Amount & Delete Button */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-12 sm:pl-0">
                  <span
                    className={`text-base font-bold font-mono ${
                      isInterest
                        ? 'text-amber-400'
                        : isDeposit
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {isDeposit ? '+' : isWithdrawal ? '-' : '+'}
                    {formatCurrency(tx.totalAmount)}
                  </span>

                  {tx.type !== 'INITIAL' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      title="Delete Transaction"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
