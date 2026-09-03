import { NextResponse } from 'next/server';
import { getSettings, getChildren, getTransactions, getMonthInterestPreview, getReconciliations, getEnvironmentInfo } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const environment = getEnvironmentInfo();
    const settings = getSettings();

    if (!settings.isOnboarded) {
      return NextResponse.json({
        isOnboarded: false,
        settings,
        environment,
      });
    }

    const children = getChildren();
    const recentTransactions = getTransactions({ limit: 30 });
    const reconciliations = getReconciliations();

    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1;

    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear--;
    }
    const prevPreview = getMonthInterestPreview(prevYear, prevMonth);
    const interestPreview = !prevPreview.alreadyPosted
      ? prevPreview
      : getMonthInterestPreview(targetYear, targetMonth);
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
      environment,
    });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
