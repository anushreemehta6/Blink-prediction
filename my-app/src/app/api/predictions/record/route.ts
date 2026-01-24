import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      positionId, 
      address, 
      asset,         // Passed as 'ETH', 'BTC', etc.
      targetPrice, 
      entryPrice, 
      isUpward, 
      amount, 
      multiplier, 
      txHash,
      status,
      isAutoTrade    // ✅ ADD THIS
    } = body;

    // 1. Strict Validation
    if (!positionId || !address || !amount || !txHash || !asset) {
      return NextResponse.json({ error: 'Missing critical fields' }, { status: 400 });
    }

    // Ensure we don't save invalid prices
    if (!entryPrice || parseFloat(entryPrice.toString()) <= 0) {
      return NextResponse.json({ error: 'Invalid entry price' }, { status: 400 });
    }

    await dbConnect();

    // Standardize address
    const cleanAddress = address.replace(/"/g, '').toLowerCase();

    // 2. Create and Save Prediction
    const prediction = new Prediction({
      userWallet: cleanAddress,
      symbol: asset.toUpperCase(), // Maps 'asset' to 'symbol' in your DB Model
      positionId: Number(positionId),
      targetPrice: targetPrice.toString(),
      entryPrice: entryPrice.toString(), 
      isUpward: isUpward,
      amount: amount.toString(),
      multiplier: Number(multiplier),
      txHash: txHash,
      status: status || 'OPEN',
      payout: '0',
      isAutoTrade: isAutoTrade || false  // ✅ ADD THIS - defaults to false if not provided
    });

    await prediction.save();
    console.log(`💾 Prediction Recorded: #${positionId} [${asset}] for ${cleanAddress} ${isAutoTrade ? '(AUTO)' : ''}`);

    return NextResponse.json({ 
      success: true, 
      id: prediction._id,
      positionId: prediction.positionId 
    });

  } catch (error: any) {
    // Handle MongoDB unique constraint (duplicate positionId)
    if (error.code === 11000) {
      console.warn('⚠️ Duplicate positionId detected, skipping save.');
      return NextResponse.json({ error: 'Duplicate record' }, { status: 409 });
    }

    console.error('❌ Failed to record prediction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}