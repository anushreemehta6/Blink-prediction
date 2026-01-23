import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Session from '@/lib/db/models/Session';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, context, delegationManager, smartAccountAddress } = await req.json();

    if (!sessionId || !context) {
      return NextResponse.json({ 
        error: "Missing required fields: sessionId and context" 
      }, { status: 400 });
    }

    console.log(`📝 Enabling session: ${sessionId}`);
    console.log(`   ACTUAL Smart Account from MetaMask: ${smartAccountAddress}`);

    await dbConnect();

    // ✅ UPDATE: Save the ACTUAL smart account address from MetaMask
    const updateData: any = {
      isActive: true,
      permissionsContext: context,
      delegationManager: delegationManager || "",
    };

    // ✅ CRITICAL: Update with the ACTUAL address from MetaMask
    if (smartAccountAddress) {
      console.log(`   Updating smart account address: ${smartAccountAddress}`);
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
