import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction';

export const dynamic = 'force-dynamic'; // ✅ Disable Vercel Caching

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    await dbConnect();

    // Get user statistics using the updated V3 static method
    const stats = await Prediction.getUserStats(address.toLowerCase());

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, max-age=0', // ✅ Force fresh data
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    );
  }
}