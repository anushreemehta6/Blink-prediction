import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction';

export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase() || 'ETH';
    await dbConnect();

    /**
     * Aggregation Pipeline:
     * 1. $match: Filter for only 'WON' trades for the specific token.
     * 2. $group: Combine by wallet address and sum the payout.
     * 3. $sort: Rank by highest total won.
     * 4. $limit: Only return the top 10 traders.
     */
    const leaderboard = await Prediction.aggregate([
      { 
        $match: { 
          symbol: symbol, 
          status: 'WON' 
        } 
      },
      {
        $group: {
          _id: "$userWallet",
          totalWon: { $sum: { $toDouble: "$payout" } }, // payout is stored as string
          tradeCount: { $sum: 1 }
        }
      },
      { $sort: { totalWon: -1 } },
      { $limit: 10 }
    ]);

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error('Leaderboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}