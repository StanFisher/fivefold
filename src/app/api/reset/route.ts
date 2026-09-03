import { NextResponse } from 'next/server';
import { getDb, updateSettings } from '@/lib/db';

export async function POST() {
  try {
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM transaction_splits').run();
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM children').run();
      db.prepare('DELETE FROM reconciliations').run();
      updateSettings({
        isOnboarded: false,
        lastReconciledBalance: null,
        lastReconciledDate: null,
        interestPostingDay: 'FIRST_OF_NEXT_MONTH',
      });
    })();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reset' }, { status: 500 });
  }
}
