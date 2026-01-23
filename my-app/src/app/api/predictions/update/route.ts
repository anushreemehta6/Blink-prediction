import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse Data
    const { positionId, payout, isWon, txHash } = await req.json();
    console.log(`🔌 API Update Request: #${positionId} | Won: ${isWon}`);

    // 2. Connect DB
    await dbConnect();

    // 3. Determine Status
    const status = isWon ? 'WON' : 'LOST';

    // 4. Find & Update
    const updated = await Prediction.findOneAndUpdate(
      { positionId: Number(positionId) }, // Find by ID
      { 
        status: status,
        payout: payout ? payout.toString() : '0',
        // Update txHash if provided
        ...(txHash && { txHash: txHash }) 
      },
      { new: true } // Return the updated document
    );

    if (!updated) {
      console.log(`❌ Bet #${positionId} not found in DB`);
      // We return 200 even if not found to stop the bot from crashing/retrying forever
      return NextResponse.json({ success: false, message: 'Bet not found' });
    }

    console.log(`✅ DB Updated: #${positionId} is now ${status}`);
    return NextResponse.json({ success: true, bet: updated });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ errorQ: error.message }, { status: 500 });
  }
}