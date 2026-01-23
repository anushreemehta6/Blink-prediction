import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Session from '@/lib/db/models/Session';

/**
 * Enable/Update a session with granted permissions
 * This is called after the user approves permissions in MetaMask Flask
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, context, delegationManager, smartAccountAddress } = await req.json();

    if (!sessionId || !context) {
      return NextResponse.json({ 
        error: "Missing required fields: sessionId and context are required" 
      }, { status: 400 });
    }

    await dbConnect();

    // Update the session with permission data
    const updateData: any = {
      isActive: true,
      permissionsContext: context,
      delegationManager: delegationManager || "",
    };

    // If smartAccountAddress is provided, update it too
    // This is the ACTUAL smart account address that MetaMask created
    if (smartAccountAddress) {
      updateData.smartAccountAddress = smartAccountAddress.toLowerCase();
    }

    const session = await Session.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true }
    );

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log(`✅ Session Enabled:`);
    console.log(`   Session ID: ${session._id}`);
    console.log(`   Smart Account: ${session.smartAccountAddress}`);
    console.log(`   User Wallet: ${session.userWallet}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Session Enable Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Check session status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    await dbConnect();

    // Find active session for this user
    const session = await Session.findOne({
      userWallet: address.toLowerCase(),
      isActive: true,
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (!session) {
      return NextResponse.json({ isActive: false });
    }

    return NextResponse.json({
      isActive: true,
      sessionId: session._id,
      smartAccountAddress: session.smartAccountAddress,
      expiresAt: session.expiresAt
    });

  } catch (error: any) {
    console.error('Session Status Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}