'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertCircle, ArrowRight, Percent, DollarSign, Wrench, Plus, Trash2, Check } from 'lucide-react';
import { formatCurrency, PRESET_COLORS } from '@/lib/formatters';
import { EnvironmentInfo } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';

interface OnboardingProps {
  onComplete: () => void;
  environment?: EnvironmentInfo;
}

export function Onboarding({ onComplete, environment }: OnboardingProps) {
  const [apy, setApy] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [totalBalance, setTotalBalance] = useState<string>('');
  const [mode, setMode] = useState<'amount' | 'percent'>('amount');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null);

  const colorPickerRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close popover without using an invisible full-screen blocking overlay
  useEffect(() => {
    if (openColorPickerIndex === null) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setOpenColorPickerIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openColorPickerIndex]);

  // Start with 1 blank placeholder for the first child
  const [childrenData, setChildrenData] = useState([
    { name: '', color: PRESET_COLORS[0].hex, amount: '', percent: '' },
  ]);

  const parsedTotal = parseFloat(totalBalance) || 0;
  const parsedApy = parseFloat(apy) || 0;

  const currentAllocated = childrenData.reduce((sum, c) => {
    if (mode === 'amount') {
      return sum + (parseFloat(c.amount) || 0);
    } else {
      const pct = parseFloat(c.percent) || 0;
      return sum + (parsedTotal * pct) / 100;
    }
  }, 0);

  const roundedAllocated = Number(currentAllocated.toFixed(2));
  const remaining = Number((parsedTotal - roundedAllocated).toFixed(2));
  const isBalanced = Math.abs(remaining) < 0.01 && parsedTotal > 0;
  const allNamesEntered = childrenData.length > 0 && childrenData.every((c) => c.name.trim().length > 0);
  const canSubmit = isBalanced && allNamesEntered && parsedApy > 0 && accountName.trim().length > 0;

  const handleAddChild = () => {
    setChildrenData((prev) => {
      const nextColorIndex = prev.length % PRESET_COLORS.length;
      return [
        ...prev,
        {
          name: '',
          color: PRESET_COLORS[nextColorIndex].hex,
          amount: '',
          percent: '',
        },
      ];
    });
  };

  const handleRemoveChild = (indexToRemove: number) => {
    if (childrenData.length <= 1) return;
    if (openColorPickerIndex === indexToRemove) setOpenColorPickerIndex(null);
    setChildrenData((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSplitEvenly = () => {
    if (parsedTotal <= 0 || childrenData.length === 0) return;
    const count = childrenData.length;
    const basePerKid = Math.floor((parsedTotal / count) * 100) / 100;
    const totalBase = basePerKid * count;
    const remainderCents = Math.round((parsedTotal - totalBase) * 100);

    setChildrenData((prev) =>
      prev.map((c, idx) => {
        const extra = idx < remainderCents ? 0.01 : 0;
        const amt = (basePerKid + extra).toFixed(2);
        const pct = ((parseFloat(amt) / parsedTotal) * 100).toFixed(1);
        return { ...c, amount: amt, percent: pct };
      })
    );
  };

  const handleChildChange = (index: number, field: string, value: string) => {
    setChildrenData((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'amount') {
        if (value === '' || isNaN(parseFloat(value))) {
          updated[index].percent = '';
        } else if (parsedTotal > 0) {
          const amt = parseFloat(value) || 0;
          updated[index].percent = ((amt / parsedTotal) * 100).toFixed(1);
        }
      } else if (field === 'percent') {
        if (value === '' || isNaN(parseFloat(value))) {
          updated[index].amount = '';
        } else if (parsedTotal > 0) {
          const pct = parseFloat(value) || 0;
          updated[index].amount = ((parsedTotal * pct) / 100).toFixed(2);
        }
      }

      return updated;
    });
  };

  const handleTotalBalanceChange = (newTotalStr: string) => {
    setTotalBalance(newTotalStr);
    const newTotal = parseFloat(newTotalStr) || 0;
    if (mode === 'percent') {
      setChildrenData((prev) =>
        prev.map((c) => {
          if (!c.percent || newTotal <= 0) {
            return { ...c, amount: '' };
          }
          return {
            ...c,
            amount: ((newTotal * (parseFloat(c.percent) || 0)) / 100).toFixed(2),
          };
        })
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!accountName.trim()) {
        setError('Please enter your Bank / Account Name.');
        return;
      }
      if (parsedApy <= 0) {
        setError('Please enter a valid APY percentage.');
        return;
      }
      if (!allNamesEntered) {
        setError('Please enter names for all children.');
        return;
      }
      if (!isBalanced) {
        setError(`Allocations must sum exactly to the total account balance ($${remaining} remaining).`);
        return;
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        apy: parsedApy,
        accountName: accountName.trim(),
        children: childrenData.map((c) => ({
          name: c.name.trim(),
          color: c.color,
          initialAmount:
            mode === 'amount'
              ? parseFloat(c.amount) || 0
              : Number(((parsedTotal * (parseFloat(c.percent) || 0)) / 100).toFixed(2)),
        })),
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      onComplete();
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Top right theme toggle */}
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>

      {/* Dev Environment Banner */}
      {environment?.isDev && (
        <div className="mb-4 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>DEVELOPMENT / TEST ENVIRONMENT</span>
            </div>
            <span className="font-mono text-[11px] text-amber-700/80 dark:text-amber-400/80">
              DB: {environment.dbFileName}
            </span>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="flex flex-col justify-center items-center gap-3 mb-2">
          <img src="/logo.png" alt="FiveFold Logo" className="h-24 sm:h-28 w-auto object-contain transition-transform hover:scale-105" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">FiveFold</h1>
        </div>
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Pooled Kids&apos; Savings Account &amp; APY Interest Reconciliation Manager
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="relative z-10 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-red-950/60 border border-rose-200 dark:border-red-800/80 flex items-center gap-3 text-rose-700 dark:text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Bank / Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="e.g. Wealthfront Cash Account"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Current Account APY (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={apy}
                    onChange={(e) => setApy(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-8"
                    placeholder="e.g. 5.00"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 text-sm font-medium">%</span>
                </div>
              </div>
            </div>

            {/* Total Account Balance */}
            <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Current Total Bank Account Balance
                </label>
                {parsedTotal > 0 && childrenData.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSplitEvenly}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium underline underline-offset-2 self-start sm:self-auto cursor-pointer"
                  >
                    Split balance equally across all {childrenData.length}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-base font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalBalance}
                  onChange={(e) => handleTotalBalanceChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-4 py-2.5 text-slate-900 dark:text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Mode Switch & Header */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Children Sub-Accounts ({childrenData.length})
                </h2>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMode('amount')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'amount'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Amounts ($)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('percent')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'percent'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  Percentages (%)
                </button>
              </div>
            </div>

            {/* Children Inputs */}
            <div className="space-y-3">
              {childrenData.map((child, index) => {
                const initialLetter = child.name.trim().charAt(0).toUpperCase() || `${index + 1}`;
                const isPickerOpen = openColorPickerIndex === index;

                return (
                  <div
                    key={index}
                    className={`relative flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 p-3 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
                      isPickerOpen ? 'z-40 ring-1 ring-indigo-500/50' : 'z-10'
                    }`}
                  >
                    {/* Option A: Clickable Avatar Circle with Floating Swatch Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenColorPickerIndex(isPickerOpen ? null : index);
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md transition-transform hover:scale-105 cursor-pointer ring-2 ring-black/10 dark:ring-white/10"
                        style={{ backgroundColor: child.color }}
                        title="Click to change color"
                      >
                        {initialLetter}
                      </button>

                      {/* Floating Popover Palette */}
                      {isPickerOpen && (
                        <div
                          ref={colorPickerRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-11 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-2xl w-48 animate-in fade-in"
                        >
                          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                            Select Child Color
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {PRESET_COLORS.map((pc) => {
                              const isSelected = child.color.toLowerCase() === pc.hex.toLowerCase();
                              return (
                                <button
                                  key={pc.hex}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChildChange(index, 'color', pc.hex);
                                    setOpenColorPickerIndex(null);
                                  }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow relative"
                                  style={{ backgroundColor: pc.hex }}
                                  title={pc.name}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Child ${index + 1} Name`}
                      required
                    />

                    {mode === 'amount' ? (
                      <div className="relative w-36">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={child.amount}
                          onChange={(e) => handleChildChange(index, 'amount', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-slate-900 dark:text-white text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    ) : (
                      <div className="relative w-36">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={child.percent}
                          onChange={(e) => handleChildChange(index, 'percent', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-6 py-1.5 text-slate-900 dark:text-white text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0.0"
                          required
                        />
                        <span className="absolute right-2 top-1.5 text-slate-400 text-xs">%</span>
                      </div>
                    )}

                    {/* Remove Child Button (visible when > 1 child) */}
                    {childrenData.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChild(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Remove Child"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Another Child Button */}
            <button
              type="button"
              onClick={handleAddChild}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Another Child
            </button>

            {/* Allocation & Reconciliation status bar */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
                isBalanced
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : parsedTotal > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isBalanced ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle
                    className={`w-5 h-5 ${parsedTotal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}
                  />
                )}
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {isBalanced
                      ? 'Account Balanced'
                      : parsedTotal > 0
                      ? 'Allocation Mismatch'
                      : 'Initial Allocation'}
                  </span>
                  <p className="text-xs opacity-80">
                    Allocated: {formatCurrency(roundedAllocated)} of {formatCurrency(parsedTotal)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-medium tracking-wider opacity-75">
                  {isBalanced ? 'Difference' : 'Remaining'}
                </span>
                <p className="text-base font-bold font-mono">
                  {formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all ${
                canSubmit && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 cursor-pointer'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {loading ? (
                'Configuring FiveFold...'
              ) : (
                <>
                  Launch FiveFold
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
