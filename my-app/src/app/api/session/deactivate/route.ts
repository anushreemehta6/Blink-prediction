import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Session from '@/lib/db/models/Session';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    await dbConnect();

    // Set isActive to false in the database
    await Session.findOneAndUpdate(
      { userWallet: address.toLowerCase() },
      { isActive: false }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}