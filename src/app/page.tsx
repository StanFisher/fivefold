'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Onboarding } from '@/components/Onboarding';
import { Dashboard } from '@/components/Dashboard';
import { AccountSettings, Child, EnvironmentInfo, MonthInterestPreview, Transaction } from '@/lib/types';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [interestPreview, setInterestPreview] = useState<MonthInterestPreview | null>(null);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [environment, setEnvironment] = useState<EnvironmentInfo | undefined>(undefined);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const data = await res.json();

      setEnvironment(data.environment);

      if (data.isOnboarded) {
        setIsOnboarded(true);
        setSettings(data.settings);
        setChildrenList(data.children || []);
        setRecentTransactions(data.recentTransactions || []);
        setInterestPreview(data.interestPreview || null);
        setReconciliations(data.reconciliations || []);
        setTotalBalance(data.totalBalance || 0);
      } else {
        setIsOnboarded(false);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetDatabase = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      setIsOnboarded(false);
      fetchData();
    } catch (err) {
      console.error('Error resetting database:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-medium">Loading FiveFold...</p>
      </div>
    );
  }

  if (!isOnboarded || !settings) {
    return <Onboarding onComplete={fetchData} environment={environment} />;
  }

  return (
    <Dashboard
      settings={settings}
      childrenList={childrenList}
      recentTransactions={recentTransactions}
      interestPreview={interestPreview}
      reconciliations={reconciliations}
      totalBalance={totalBalance}
      environment={environment}
      onRefresh={fetchData}
      onResetDatabase={handleResetDatabase}
    />
  );
}
