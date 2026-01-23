import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '10');

    await dbConnect();

    let query = {};

    if (address) {
      // User Request: Fetch history for specific address
      const cleanAddress = address.replace(/"/g, '').toLowerCase();
      query = {
        $or: [
          { userWallet: cleanAddress },
          { userWallet: `"${cleanAddress}"` }
        ]
      };
    } else {
      // Bot Request: Fetch ALL open positions to process
      query = { status: 'OPEN' };
    }

    const predictions = await Prediction.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();

    const formattedPredictions = predictions.map((pred: any) => ({
      _id: pred._id.toString(),
      positionId: pred.positionId,
      userWallet: pred.userWallet, 
      targetPrice: pred.targetPrice,
      entryPrice: pred.entryPrice,
      multiplier: pred.multiplier,
      isUpward: pred.isUpward,
      amount: pred.amount,
      status: pred.status,
      payout: pred.payout,
      txHash: pred.txHash,
      createdAt: pred.createdAt,
    }));

    return NextResponse.json({
      predictions: formattedPredictions,
      count: formattedPredictions.length,
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}