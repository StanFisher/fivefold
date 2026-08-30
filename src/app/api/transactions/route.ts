import { NextResponse } from 'next/server';
import { createTransaction, getTransactions } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId') ? parseInt(searchParams.get('childId')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const transactions = getTransactions({ childId, limit });
    return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, type, totalAmount, description, splits } = body;

    if (!date || !type || !totalAmount || !splits || splits.length === 0) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
    }

    const tx = createTransaction({
      date,
      type,
      totalAmount,
      description: description || '',
      splits,
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 });
  }
}
