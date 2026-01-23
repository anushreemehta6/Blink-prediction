import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PYTH_API_URL = process.env.NEXT_PUBLIC_PYTH_API_URL || 'https://hermes.pyth.network';
const ETH_PRICE_ID = process.env.NEXT_PUBLIC_ETH_PRICE_ID || '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const asset = searchParams.get('asset') || 'ETH';

    // Get price ID based on asset
    let priceId = ETH_PRICE_ID;
    if (asset === 'BTC') {
      priceId = process.env.NEXT_PUBLIC_BTC_PRICE_ID || '';
    } else if (asset === 'SOL') {
      priceId = process.env.NEXT_PUBLIC_SOL_PRICE_ID || '';
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid asset or price ID not configured' },
        { status: 400 }
      );
    }

    // Fetch latest price from Pyth
    const response = await axios.get(
      `${PYTH_API_URL}/v2/updates/price/latest?ids[]=${priceId}`
    );

    if (!response.data.parsed || response.data.parsed.length === 0) {
      throw new Error('No price data returned');
    }

    const priceData = response.data.parsed[0];
    const price = Number(priceData.price.price) * Math.pow(10, priceData.price.expo);

    return NextResponse.json({
      asset,
      price: parseFloat(price.toFixed(2)),
      priceId,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Pyth price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}