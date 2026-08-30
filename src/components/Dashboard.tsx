'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  Settings as SettingsIcon,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Layers,
  ArrowUpRight,
  User,
  Calendar,
  Percent,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import { Child, Transaction, AccountSettings, MonthInterestPreview, EnvironmentInfo } from '@/lib/types';
import { formatCurrency, formatDateDisplay } from '@/lib/formatters';
import { TransactionModal } from './TransactionModal';
import { InterestModal } from './InterestModal';
import { ReconciliationModal } from './ReconciliationModal';
import { ChildDetailModal } from './ChildDetailModal';
import { SettingsModal } from './SettingsModal';
import { TransactionList } from './TransactionList';

interface DashboardProps {
  settings: AccountSettings;
  childrenList: Child[];
  recentTransactions: Transaction[];
  interestPreview: MonthInterestPreview | null;
  reconciliations: any[];
  totalBalance: number;
  environment?: EnvironmentInfo;
  onRefresh: () => void;
  onResetDatabase: () => void;
}

export function Dashboard({
  settings,
  childrenList,
  recentTransactions,
  interestPreview,
  reconciliations,
  totalBalance,
  environment,
  onRefresh,
  onResetDatabase,
}: DashboardProps) {
  // Modal states
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [selectedChildForTx, setSelectedChildForTx] = useState<number | null>(null);

  const [isInterestOpen, setIsInterestOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [activeChildDetail, setActiveChildDetail] = useState<Child | null>(null);

  const handleQuickDeposit = (childId?: number) => {
    setTransactionType('DEPOSIT');
    setSelectedChildForTx(childId || null);
    setIsTransactionOpen(true);
  };

  const handleQuickWithdraw = (childId?: number) => {
    setTransactionType('WITHDRAWAL');
    setSelectedChildForTx(childId || null);
    setIsTransactionOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete transaction', err);
    }
  };

  const isReconciled =
    settings.lastReconciledBalance !== null &&
    settings.lastReconciledBalance !== undefined &&
    Math.abs(totalBalance - settings.lastReconciledBalance) < 0.01;

  const monthlyEst = (totalBalance * (settings.apy / 100)) / 12;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Dev Mode Banner */}
      {environment?.isDev && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>DEVELOPMENT / TEST ENVIRONMENT &mdash; Isolated test database active ({environment.dbFileName})</span>
            </div>
            <button
              onClick={() => {
                if (confirm('Reset the development test database back to fresh onboarding?')) {
                  onResetDatabase();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Dev DB
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">FiveFold</span>
                {environment?.isDev ? (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    DEV
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    PROD
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 block -mt-0.5">
                {settings.accountName}
              </span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            {/* APY Badge */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <Percent className="w-3.5 h-3.5 text-indigo-400" />
              <span>{settings.apy.toFixed(2)}% APY</span>
            </button>

            {/* Post Monthly Interest button */}
            <button
              onClick={() => setIsInterestOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Post Interest</span>
            </button>

            {/* Reconcile button */}
            <button
              onClick={() => setIsReconcileOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Reconcile</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 flex-1">
        {/* Account Overview Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Total Bank Balance */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Pooled Savings Balance
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    isReconciled
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                  }`}
                >
                  {isReconciled ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Reconciled
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Needs Reconcile
                    </>
                  )}
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight pt-1">
                {formatCurrency(totalBalance)}
              </div>
            </div>

            {/* Proportional Stack Bar */}
            <div className="pt-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Account Share Breakdown (5 Children)</span>
                <span>100% Allocated</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                {childrenList.map((c) => (
                  <div
                    key={c.id}
                    className="h-full transition-all hover:opacity-80 cursor-pointer"
                    style={{
                      width: `${c.percentage || 0}%`,
                      backgroundColor: c.color,
                    }}
                    title={`${c.name}: ${formatCurrency(c.balance || 0)} (${c.percentage}%)`}
                    onClick={() => setActiveChildDetail(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Interest & Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly Est. Accrual
                </span>
                <span className="text-xs text-amber-400 font-medium">
                  {settings.apy.toFixed(2)}% APY
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                ~{formatCurrency(monthlyEst)}
                <span className="text-xs text-slate-400 font-sans font-normal ml-1">/mo</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Compounded daily via standard Wealthfront calculation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleQuickDeposit()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Deposit
              </button>
              <button
                type="button"
                onClick={() => handleQuickWithdraw()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all"
              >
                <MinusCircle className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* 5 Children Sub-Accounts Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Children Sub-Accounts</h2>
              <p className="text-xs text-slate-400">
                Individual balances and allocations within the pooled savings account
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {childrenList.map((child) => (
              <div
                key={child.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all hover:shadow-indigo-500/5 group"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setActiveChildDetail(child)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md"
                      style={{ backgroundColor: child.color }}
                    >
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {child.name}
                      </h3>
                      <span className="text-xs text-slate-400">{child.percentage}% share</span>
                    </div>
                  </div>
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => setActiveChildDetail(child)}
                >
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 block mb-0.5">
                    Sub-Balance
                  </span>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {formatCurrency(child.balance || 0)}
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${child.percentage || 0}%`,
                      backgroundColor: child.color,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickDeposit(child.id);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-3 h-3 text-emerald-400" />
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickWithdraw(child.id);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <MinusCircle className="w-3 h-3 text-rose-400" />
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Transaction History Ledger */}
        <TransactionList
          transactions={recentTransactions}
          childrenList={childrenList}
          onDeleteTransaction={handleDeleteTransaction}
          onSelectChild={(childId) => {
            const found = childrenList.find((c) => c.id === childId);
            if (found) setActiveChildDetail(found);
          }}
        />
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isTransactionOpen}
        onClose={() => setIsTransactionOpen(false)}
        onSuccess={onRefresh}
        childrenList={childrenList}
        defaultChildId={selectedChildForTx}
        defaultType={transactionType}
      />

      <InterestModal
        isOpen={isInterestOpen}
        onClose={() => setIsInterestOpen(false)}
        onSuccess={onRefresh}
        initialPreview={interestPreview}
        accountApy={settings.apy}
      />

      <ReconciliationModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
        onSuccess={onRefresh}
        currentLedgerTotal={totalBalance}
        reconciliations={reconciliations}
      />

      <ChildDetailModal
        isOpen={Boolean(activeChildDetail)}
        onClose={() => setActiveChildDetail(null)}
        child={activeChildDetail}
        totalAccountBalance={totalBalance}
        onQuickDeposit={(childId) => handleQuickDeposit(childId)}
        onQuickWithdraw={(childId) => handleQuickWithdraw(childId)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSuccess={onRefresh}
        settings={settings}
        childrenList={childrenList}
        onResetDatabase={onResetDatabase}
      />
    </div>
  );
}
