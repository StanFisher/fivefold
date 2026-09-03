import { NextResponse } from 'next/server';
import { getSettings, updateSettings, updateChild, getChildren } from '@/lib/db';

export async function GET() {
  try {
    const settings = getSettings();
    const children = getChildren();
    return NextResponse.json({ settings, children });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apy, accountName, interestPostingDay, children } = body;

    if (apy !== undefined || accountName !== undefined || interestPostingDay !== undefined) {
      updateSettings({
        ...(apy !== undefined ? { apy: parseFloat(apy) } : {}),
        ...(accountName !== undefined ? { accountName } : {}),
        ...(interestPostingDay !== undefined ? { interestPostingDay } : {}),
      });
    }

    if (children && Array.isArray(children)) {
      for (const child of children) {
        if (child.id && child.name && child.color) {
          updateChild(child.id, child.name, child.color);
        }
      }
    }

    return NextResponse.json({
      success: true,
      settings: getSettings(),
      children: getChildren(),
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
