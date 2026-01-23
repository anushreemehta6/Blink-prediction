import axios from 'axios';

const PYTH_API_URL = process.env.NEXT_PUBLIC_PYTH_API_URL || 'https://hermes.pyth.network';

export async function fetchPythPriceUpdate(priceId: string): Promise<string[]> {
  try {
    const response = await axios.get(
      `${PYTH_API_URL}/v2/updates/price/latest?ids[]=${priceId}`
    );

    if (!response.data.binary || !response.data.binary.data) {
      throw new Error('No price update data returned');
    }

    return response.data.binary.data.map((data: string) => `0x${data}`);
  } catch (error: any) {
    console.error('Failed to fetch Pyth price update:', error);
    throw error;
  }
}

export async function getCurrentPrice(priceId: string): Promise<number> {
  try {
    const response = await axios.get(
      `${PYTH_API_URL}/v2/updates/price/latest?ids[]=${priceId}`
    );

    if (!response.data.parsed || response.data.parsed.length === 0) {
      throw new Error('No price data returned');
    }

    const priceData = response.data.parsed[0];
    const price = Number(priceData.price.price) * Math.pow(10, priceData.price.expo);

    return price;
  } catch (error: any) {
    console.error('Failed to fetch current price:', error);
    throw error;
  }
}