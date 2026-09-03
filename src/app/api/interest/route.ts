import { NextResponse } from 'next/server';
import { getMonthInterestPreview, postMonthlyInterest } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1;

    const preview = getMonthInterestPreview(year, month);
    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error('Error fetching interest preview:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { year, month, customAmount, postingDate } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required.' }, { status: 400 });
    }

    const tx = postMonthlyInterest(year, month, customAmount, postingDate);
    return NextResponse.json({ success: true, transaction: tx });
  } catch (error: any) {
    console.error('Error posting monthly interest:', error);
    return NextResponse.json({ error: error.message || 'Failed to post interest' }, { status: 500 });
  }
}
