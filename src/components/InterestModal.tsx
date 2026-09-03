'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, Info, Calendar } from 'lucide-react';
import { MonthInterestPreview } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { allocateCustomInterest } from '@/lib/interest';

interface InterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPreview?: MonthInterestPreview | null;
  accountApy: number;
}

export function InterestModal({
  isOpen,
  onClose,
  onSuccess,
  initialPreview,
  accountApy,
}: InterestModalProps) {
  const getInitialYearMonth = () => {
    if (initialPreview) {
      return { year: initialPreview.year, month: initialPreview.month };
    }
    const now = new Date();
    let month = now.getMonth(); // 0 is Jan, so if now is Sept (8), month is 8 (August in 1-indexed)
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year--;
    }
    return { year, month };
  };

  const initialYM = getInitialYearMonth();
  const [selectedYear, setSelectedYear] = useState<number>(initialYM.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialYM.month);
  const [preview, setPreview] = useState<MonthInterestPreview | null>(initialPreview || null);
  const [customTotal, setCustomTotal] = useState<string>(
    initialPreview ? initialPreview.totalCalculatedInterest.toFixed(2) : ''
  );
  const [postingDate, setPostingDate] = useState<string>(initialPreview?.postingDate || '');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interest?year=${y}&month=${m}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to calculate interest');
      setPreview(data.preview);
      setCustomTotal(data.preview.totalCalculatedInterest.toFixed(2));
      setPostingDate(data.preview.postingDate || '');
    } catch (err: any) {
      setError(err.message || 'Error fetching interest calculation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchPreview(selectedYear, selectedMonth);
    }
  }, [isOpen, selectedYear, selectedMonth]);

  // Dynamically compute child allocations based on customTotal in real-time
  const dynamicAllocations = useMemo(() => {
    if (!preview) return [];
    const parsed = parseFloat(customTotal);
    if (isNaN(parsed) || parsed === preview.totalCalculatedInterest) {
      return preview.childAllocations;
    }

    let weights = preview.childAllocations.map((c) => ({
      id: c.childId,
      weight: c.calculatedInterest,
    }));
    const totalCalcWeight = weights.reduce((s, c) => s + c.weight, 0);

    if (totalCalcWeight <= 0) {
      weights = preview.childAllocations.map((c) => ({
        id: c.childId,
        weight: Math.max(0, c.averageDailyBalance),
      }));
    }

    const totalAdbWeight = weights.reduce((s, c) => s + c.weight, 0);
    if (totalAdbWeight <= 0) {
      weights = preview.childAllocations.map((c) => ({
        id: c.childId,
        weight: Math.max(0, c.endBalance),
      }));
    }

    const distributed = allocateCustomInterest(weights, parsed);
    return preview.childAllocations.map((c) => ({
      ...c,
      calculatedInterest: distributed.get(c.childId) || 0,
    }));
  }, [preview, customTotal]);

  if (!isOpen) return null;

  const handleMonthChange = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  };

  const handlePostInterest = async () => {
    if (!preview || preview.alreadyPosted) return;
    setPosting(true);
    setError(null);

    try {
      const parsedCustom = parseFloat(customTotal);
      const res = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          customAmount: !isNaN(parsedCustom) ? parsedCustom : undefined,
          postingDate: postingDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post interest');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error posting interest');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Interest Distribution</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily APY Accrual ({accountApy.toFixed(2)}% APY)
              </p>
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Month Navigator & Posting Date */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 rounded-xl p-3">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                &larr; Previous Month
              </button>
              <div className="text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Statement Period
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {preview?.monthName || `${selectedYear}-${selectedMonth}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Next Month &rarr;
              </button>
            </div>

            {!preview?.alreadyPosted && (
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Transaction Posting Date:</span>
                </div>
                <input
                  type="date"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              Calculating daily accruals...
            </div>
          ) : preview ? (
            <>
              {/* Status Banner */}
              {preview.alreadyPosted ? (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3 text-blue-700 dark:text-blue-300 text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="font-semibold">Interest Already Posted</span>
                    <p className="text-xs text-blue-600/80 dark:text-blue-300/80">
                      Interest for {preview.monthName} has already been applied to the account.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200/90">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Accrued daily on each child&apos;s exact balance over {preview.daysInMonth} days at {preview.apy}% APY. Penny-exact allocation guaranteed.
                  </span>
                </div>
              )}

              {/* Total Interest Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Account Interest Earned
                  </span>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {formatCurrency(parseFloat(customTotal) || preview.totalCalculatedInterest)}
                  </div>
                </div>

                {!preview.alreadyPosted && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 dark:text-slate-400">
                      Adjust total (if bank differs by penny):
                    </label>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customTotal}
                        onChange={(e) => setCustomTotal(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-5 pr-2 py-1 text-slate-900 dark:text-white text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Breakdown Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Per-Child Allocation Breakdown
                </h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Child</th>
                        <th className="py-2.5 px-3 text-right">Avg Balance</th>
                        <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">Interest Added</th>
                        <th className="py-2.5 px-3 text-right">New Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {dynamicAllocations.map((alloc) => {
                        const newBal = alloc.endBalance + alloc.calculatedInterest;
                        return (
                          <tr key={alloc.childId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: alloc.childColor }}
                                />
                                <span>{alloc.childName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                              {formatCurrency(alloc.averageDailyBalance)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                              +{formatCurrency(alloc.calculatedInterest)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-200">
                              {formatCurrency(newBal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
          {!preview?.alreadyPosted && (
            <button
              type="button"
              onClick={handlePostInterest}
              disabled={posting || loading || !preview || (parseFloat(customTotal) || preview.totalCalculatedInterest) <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {posting
                ? 'Posting Interest...'
                : `Apply ${formatCurrency(parseFloat(customTotal) || preview?.totalCalculatedInterest || 0)} to Children`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
