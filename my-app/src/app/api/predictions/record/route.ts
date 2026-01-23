import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      positionId, 
      address, 
      targetPrice, 
      entryPrice, 
      isUpward, 
      amount, 
      multiplier, 
      txHash,
      status     
    } = body;

   
    if (!positionId || !address || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing critical fields' }, { status: 400 });
    }

    await dbConnect();

  
    const cleanAddress = address.replace(/"/g, '').toLowerCase();

    const prediction = new Prediction({
      userWallet: cleanAddress,
      positionId: Number(positionId),
      targetPrice: targetPrice.toString(),
      
      entryPrice: entryPrice ? entryPrice.toString() : '0', 
      isUpward: isUpward,
      amount: amount.toString(),
      multiplier: Number(multiplier),
      txHash: txHash,
   
      status: status || 'OPEN',
      payout: '0'
    });

    await prediction.save();
    console.log(`💾 Prediction Recorded: #${positionId} for ${cleanAddress}`);

    return NextResponse.json({ 
      success: true, 
      id: prediction._id,
      positionId: prediction.positionId 
    });

  } catch (error: any) {
    
    if (error.code === 11000) {
      console.warn('⚠️ Duplicate positionId detected, skipping save.');
      return NextResponse.json({ error: 'Duplicate record' }, { status: 409 });
    }

    console.error('❌ Failed to record prediction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}