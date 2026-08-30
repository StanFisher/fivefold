import { NextResponse } from 'next/server';
import { recordReconciliation, getReconciliations } from '@/lib/db';

export async function GET() {
  try {
    const reconciliations = getReconciliations();
    return NextResponse.json({ reconciliations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { statementBalance, date } = body;

    if (typeof statementBalance !== 'number') {
      return NextResponse.json({ error: 'Valid statement balance is required.' }, { status: 400 });
    }

    const result = recordReconciliation(statementBalance, date);
    return NextResponse.json({ success: true, reconciliation: result });
  } catch (error: any) {
    console.error('Error recording reconciliation:', error);
    return NextResponse.json({ error: error.message || 'Failed to record reconciliation' }, { status: 500 });
  }
}
