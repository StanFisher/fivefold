'use client';

import React, { useState } from 'react';
import { ShieldCheck, Sparkles, AlertCircle, ArrowRight, Percent, DollarSign } from 'lucide-react';
import { formatCurrency, PRESET_COLORS } from '@/lib/formatters';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [apy, setApy] = useState<string>('5.00');
  const [accountName, setAccountName] = useState<string>('Wealthfront Cash Account');
  const [totalBalance, setTotalBalance] = useState<string>('10000.00');
  const [mode, setMode] = useState<'amount' | 'percent'>('amount');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [childrenData, setChildrenData] = useState([
    { name: 'Child 1', color: PRESET_COLORS[0].hex, amount: '2000.00', percent: '20' },
    { name: 'Child 2', color: PRESET_COLORS[1].hex, amount: '2000.00', percent: '20' },
    { name: 'Child 3', color: PRESET_COLORS[2].hex, amount: '2000.00', percent: '20' },
    { name: 'Child 4', color: PRESET_COLORS[3].hex, amount: '2000.00', percent: '20' },
    { name: 'Child 5', color: PRESET_COLORS[4].hex, amount: '2000.00', percent: '20' },
  ]);

  const parsedTotal = parseFloat(totalBalance) || 0;

  // Calculate current allocated sum based on mode
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

  // Split evenly helper
  const handleSplitEvenly = () => {
    if (parsedTotal <= 0) return;
    const basePerKid = Math.floor((parsedTotal / 5) * 100) / 100;
    const totalBase = basePerKid * 5;
    const remainderCents = Math.round((parsedTotal - totalBase) * 100);

    const updated = childrenData.map((c, idx) => {
      const extra = idx < remainderCents ? 0.01 : 0;
      const amt = (basePerKid + extra).toFixed(2);
      const pct = ((parseFloat(amt) / parsedTotal) * 100).toFixed(1);
      return { ...c, amount: amt, percent: pct };
    });
    setChildrenData(updated);
  };

  const handleChildChange = (index: number, field: string, value: string) => {
    const updated = [...childrenData];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'amount' && parsedTotal > 0) {
      const amt = parseFloat(value) || 0;
      updated[index].percent = ((amt / parsedTotal) * 100).toFixed(1);
    } else if (field === 'percent' && parsedTotal > 0) {
      const pct = parseFloat(value) || 0;
      updated[index].amount = ((parsedTotal * pct) / 100).toFixed(2);
    }

    setChildrenData(updated);
  };

  const handleTotalBalanceChange = (newTotalStr: string) => {
    setTotalBalance(newTotalStr);
    const newTotal = parseFloat(newTotalStr) || 0;
    if (mode === 'percent' && newTotal > 0) {
      const updated = childrenData.map((c) => ({
        ...c,
        amount: ((newTotal * (parseFloat(c.percent) || 0)) / 100).toFixed(2),
      }));
      setChildrenData(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setError(`Allocations must sum exactly to the total account balance ($${remaining} remaining).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        apy: parseFloat(apy) || 5.0,
        accountName,
        children: childrenData.map((c) => ({
          name: c.name.trim() || 'Child',
          color: c.color,
          initialAmount: mode === 'amount' ? parseFloat(c.amount) || 0 : Number(((parsedTotal * (parseFloat(c.percent) || 0)) / 100).toFixed(2)),
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">FiveFold</h1>
        </div>
        <p className="text-center text-slate-400 text-sm">
          Pooled Kids&apos; Savings Account &amp; APY Interest Reconciliation Manager
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center gap-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Bank / Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="e.g. Wealthfront Cash Account"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Current Account APY (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={apy}
                    onChange={(e) => setApy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-8"
                    placeholder="5.00"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 text-sm font-medium">%</span>
                </div>
              </div>
            </div>

            {/* Total Account Balance */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Current Total Bank Account Balance
                </label>
                <button
                  type="button"
                  onClick={handleSplitEvenly}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 self-start sm:self-auto"
                >
                  Split balance equally across all 5
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-base font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalBalance}
                  onChange={(e) => handleTotalBalanceChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-4 py-2.5 text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="10000.00"
                  required
                />
              </div>
            </div>

            {/* Mode Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <h2 className="text-sm font-semibold text-slate-200">5 Children Allocation</h2>
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setMode('amount')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    mode === 'amount'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Amounts ($)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('percent')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    mode === 'percent'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  Percentages (%)
                </button>
              </div>
            </div>

            {/* 5 Children Inputs */}
            <div className="space-y-3">
              {childrenData.map((child, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/50 p-3 rounded-xl hover:border-slate-600 transition-colors"
                >
                  {/* Color circle */}
                  <div className="relative group">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow"
                      style={{ backgroundColor: child.color }}
                    >
                      {index + 1}
                    </div>
                  </div>

                  {/* Name */}
                  <input
                    type="text"
                    value={child.name}
                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`Child ${index + 1} Name`}
                    required
                  />

                  {/* Amount / Percent Input */}
                  {mode === 'amount' ? (
                    <div className="relative w-36">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={child.amount}
                        onChange={(e) => handleChildChange(index, 'amount', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-white text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-6 py-1.5 text-white text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="20.0"
                        required
                      />
                      <span className="absolute right-2 top-1.5 text-slate-400 text-xs">%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reconciliation status bar */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
                isBalanced
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isBalanced ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <span className="font-semibold">
                    {isBalanced ? 'Account Balanced' : 'Allocation Mismatch'}
                  </span>
                  <p className="text-xs opacity-80">
                    Allocated: {formatCurrency(roundedAllocated)} of {formatCurrency(parsedTotal)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-medium tracking-wider opacity-75">
                  {isBalanced ? 'Difference' : 'Remaining to Allocate'}
                </span>
                <p className="text-base font-bold font-mono">
                  {formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isBalanced || loading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all ${
                isBalanced && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
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
