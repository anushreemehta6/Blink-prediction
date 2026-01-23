// src/app/api/predictions/place/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ETH_PRICE_ID = process.env.NEXT_PUBLIC_ETH_PRICE_ID || '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

export async function POST(req: NextRequest) {
  try {
    const response = await axios.get(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${ETH_PRICE_ID}`,
      { timeout: 5000 }
    );
    
    const pythPriceUpdate = response.data.binary.data.map((d: string) => `0x${d}`);

    return NextResponse.json({
      success: true,
      pythPriceUpdate // Return this to frontend
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch Pyth data' }, { status: 500 });
  }
}