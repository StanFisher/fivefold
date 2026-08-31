'use client';

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, MinusCircle, DollarSign, AlertCircle } from 'lucide-react';
import { Child } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  childrenList: Child[];
  defaultChildId?: number | null;
  defaultType?: 'DEPOSIT' | 'WITHDRAWAL';
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  childrenList,
  defaultChildId,
  defaultType = 'DEPOSIT',
}: TransactionModalProps) {
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL'>(defaultType);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [allocationMode, setAllocationMode] = useState<'single' | 'split_equal' | 'split_custom'>('single');
  const [selectedChildId, setSelectedChildId] = useState<number>(childrenList[0]?.id || 1);
  const [customSplits, setCustomSplits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTotalAmount('');
      setDescription('');
      setCustomSplits({});
      setError(null);
      setDate(new Date().toISOString().split('T')[0]);
      if (defaultType) setType(defaultType);
      if (defaultChildId) {
        setSelectedChildId(defaultChildId);
        setAllocationMode('single');
      } else if (childrenList && childrenList.length > 0) {
        setSelectedChildId(childrenList[0].id);
        setAllocationMode('single');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedTotal = parseFloat(totalAmount) || 0;

  // Compute splits based on allocation mode
  let finalSplits: { childId: number; amount: number }[] = [];
  let isBalanced = true;
  let splitSum = 0;

  if (allocationMode === 'single') {
    const sign = type === 'WITHDRAWAL' ? -1 : 1;
    finalSplits = [{ childId: selectedChildId, amount: sign * parsedTotal }];
    isBalanced = parsedTotal > 0;
  } else if (allocationMode === 'split_equal') {
    if (parsedTotal > 0 && childrenList.length > 0) {
      const sign = type === 'WITHDRAWAL' ? -1 : 1;
      const basePerKid = Math.floor((parsedTotal / childrenList.length) * 100) / 100;
      const totalBase = basePerKid * childrenList.length;
      const remainderCents = Math.round((parsedTotal - totalBase) * 100);

      finalSplits = childrenList.map((c, idx) => {
        const extra = idx < remainderCents ? 0.01 : 0;
        const amt = Number((basePerKid + extra).toFixed(2));
        return { childId: c.id, amount: sign * amt };
      });
      isBalanced = true;
    } else {
      isBalanced = false;
    }
  } else if (allocationMode === 'split_custom') {
    const sign = type === 'WITHDRAWAL' ? -1 : 1;
    finalSplits = childrenList.map((c) => {
      const amt = parseFloat(customSplits[c.id] || '0') || 0;
      splitSum += amt;
      return { childId: c.id, amount: sign * amt };
    });
    isBalanced = Math.abs(parsedTotal - splitSum) < 0.01 && parsedTotal > 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || parsedTotal <= 0) {
      setError('Please ensure amounts are valid and match the total.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          type,
          totalAmount: parsedTotal,
          description: description.trim() || (type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'),
          splits: finalSplits,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save transaction');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            {type === 'DEPOSIT' ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <PlusCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <MinusCircle className="w-5 h-5" />
              </div>
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {type === 'DEPOSIT' ? 'Record Deposit' : 'Record Withdrawal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setType('DEPOSIT')}
              className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'DEPOSIT'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Deposit (+)
            </button>
            <button
              type="button"
              onClick={() => setType('WITHDRAWAL')}
              className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'WITHDRAWAL'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              Withdrawal (-)
            </button>
          </div>

          {/* Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Total Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-slate-900 dark:text-white font-semibold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Description / Memo (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Description or memo"
            />
          </div>

          {/* Allocation Mode */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Allocate To
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAllocationMode('single')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  allocationMode === 'single'
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Single Child
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('split_equal')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  allocationMode === 'split_equal'
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Split All ({childrenList.length}) Evenly
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('split_custom')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  allocationMode === 'split_custom'
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Custom Split
              </button>
            </div>

            {/* Single Child Selector */}
            {allocationMode === 'single' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {childrenList.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedChildId(child.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedChildId === child.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-white ring-1 ring-indigo-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: child.color }}
                      />
                      <span className="text-xs font-semibold truncate">{child.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Split Equal Preview */}
            {allocationMode === 'split_equal' && parsedTotal > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Each child receives:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(parsedTotal / childrenList.length)}
                  </span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {childrenList.map((c) => (
                    <div
                      key={c.id}
                      className="flex-1 text-center py-1 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-transparent text-[10px] text-slate-700 dark:text-slate-300 truncate"
                      title={c.name}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Split Inputs */}
            {allocationMode === 'split_custom' && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {childrenList.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: child.color }}
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{child.name}</span>
                    </div>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customSplits[child.id] || ''}
                        onChange={(e) =>
                          setCustomSplits({ ...customSplits, [child.id]: e.target.value })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-5 pr-2 py-1 text-slate-900 dark:text-white text-xs text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-1 px-1">
                  <span>Custom Split Total:</span>
                  <span
                    className={`font-mono font-semibold ${
                      isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(splitSum)} / {formatCurrency(parsedTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
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
              disabled={loading || !isBalanced || parsedTotal <= 0}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all cursor-pointer ${
                type === 'DEPOSIT'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading
                ? 'Recording...'
                : type === 'DEPOSIT'
                ? `Deposit ${parsedTotal > 0 ? formatCurrency(parsedTotal) : ''}`
                : `Withdraw ${parsedTotal > 0 ? formatCurrency(parsedTotal) : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
