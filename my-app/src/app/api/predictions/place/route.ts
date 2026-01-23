// src/app/api/predictions/place/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { PYTH_PRICE_IDS, AssetSymbol, getPriceId } from '@/lib/constants';

const PYTH_API_URL = process.env.NEXT_PUBLIC_PYTH_API_URL || 'https://hermes.pyth.network';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset = 'ETH' } = body;

    // Validate asset
    if (!(asset in PYTH_PRICE_IDS)) {
      return NextResponse.json(
        { error: `Invalid asset. Supported: ${Object.keys(PYTH_PRICE_IDS).join(', ')}` },
        { status: 400 }
      );
    }

    const priceId = getPriceId(asset as AssetSymbol);

    // Fetch latest Pyth update data
    const response = await axios.get(
      `${PYTH_API_URL}/v2/updates/price/latest?ids[]=${priceId}`,
      { timeout: 5000 }
    );

    if (!response.data.binary || !response.data.binary.data) {
      throw new Error('No Pyth update data returned');
    }
    
    const pythPriceUpdate = response.data.binary.data.map((d: string) => `0x${d}`);

    return NextResponse.json({
      success: true,
      asset,
      priceId,
      pythPriceUpdate,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Pyth data fetch error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch Pyth data', details: error.message },
      { status: 500 }
    );
  }
}