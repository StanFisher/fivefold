import { NextResponse } from 'next/server';
import { getSettings, getChildren, getTransactions, getMonthInterestPreview, getReconciliations } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getSettings();
    if (!settings.isOnboarded) {
      return NextResponse.json({
        isOnboarded: false,
        settings,
      });
    }

    const children = getChildren();
    const recentTransactions = getTransactions({ limit: 30 });
    const reconciliations = getReconciliations();

    const now = new Date();
    // Default to current month or previous month if on the 1st
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1;

    const interestPreview = getMonthInterestPreview(targetYear, targetMonth);
    const totalBalance = Number(
      children.reduce((s, c) => s + (c.balance || 0), 0).toFixed(2)
    );

    return NextResponse.json({
      isOnboarded: true,
      settings,
      children,
      recentTransactions,
      interestPreview,
      reconciliations,
      totalBalance,
    });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
