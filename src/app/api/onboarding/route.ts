import { NextResponse } from 'next/server';
import { completeOnboarding } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apy, accountName, children, date } = body;

    if (!children || !Array.isArray(children) || children.length < 1) {
      return NextResponse.json({ error: 'At least one child is required.' }, { status: 400 });
    }

    if (typeof apy !== 'number' || apy < 0) {
      return NextResponse.json({ error: 'Valid APY percentage is required.' }, { status: 400 });
    }

    completeOnboarding({
      apy,
      accountName: accountName || 'Primary Savings',
      children,
      date,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error during onboarding:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete onboarding' }, { status: 500 });
  }
}
