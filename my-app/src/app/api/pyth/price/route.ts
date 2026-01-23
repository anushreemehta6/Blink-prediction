import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { PYTH_PRICE_IDS, AssetSymbol, getPriceId } from '@/lib/constants';

const PYTH_API_URL = 'https://hermes.pyth.network'; 

export async function GET(req: NextRequest) {
  try {
    // ✅ Fix: Use req.nextUrl.searchParams to avoid 'searchParams' name error
    const assetParam = req.nextUrl.searchParams.get('asset') || 'ETH';
    const asset = assetParam.toUpperCase() as AssetSymbol;

    // 1. Validate asset
    if (!(asset in PYTH_PRICE_IDS)) {
      return NextResponse.json(
        { error: `Invalid asset. Supported: ${Object.keys(PYTH_PRICE_IDS).join(', ')}` },
        { status: 400 }
      );
    }

    // ✅ Fix: Normalize ID for Pyth Hermes (strip 0x if present)
    const rawPriceId = getPriceId(asset);
    const cleanPriceId = rawPriceId.startsWith('0x') ? rawPriceId.slice(2) : rawPriceId;

    /**
     * ✅ Correct Hermes V2 Endpoint
     * Note the use of ids[] as the query parameter key
     */
    const response = await axios.get(
      `${PYTH_API_URL}/v2/updates/price/latest?ids[]=${cleanPriceId}`,
      { timeout: 5000 }
    );

    if (!response.data.parsed || response.data.parsed.length === 0) {
      throw new Error('No price data returned from Pyth');
    }

    const priceData = response.data.parsed[0];
    
    // Pyth prices are strings in JSON: Actual = price * 10^expo
    const rawPrice = BigInt(priceData.price.price);
    const expo = priceData.price.expo;
    const price = Number(rawPrice) * Math.pow(10, expo);

    return NextResponse.json({
      asset,
      price: parseFloat(price.toFixed(4)), // Better precision for all tokens
      priceId: `0x${cleanPriceId}`,
      publishTime: priceData.price.publish_time,
      timestamp: Date.now(),
    });

  } catch (error: any) {
    // Log the actual error response from Hermes if it exists
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`❌ Pyth Fetch Error [${req.nextUrl.searchParams.get('asset')}]:`, errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fetch price', details: errorMessage },
      { status: 500 }
    );
  }
}