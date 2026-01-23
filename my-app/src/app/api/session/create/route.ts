
import { NextRequest, NextResponse } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { toMetaMaskSmartAccount, Implementation } from "@metamask/smart-accounts-kit";
import { publicClient } from '@/lib/flask/bundler';
import dbConnect from '@/lib/db/connect';
import Session from '@/lib/db/models/Session';

export async function POST(req: NextRequest) {
  try {
    const { userAddress } = await req.json();
    
    if (!userAddress) {
      return NextResponse.json({ error: "Missing userAddress" }, { status: 400 });
    }

    await dbConnect();

    // Delete any existing sessions for this user
    await Session.deleteMany({ userWallet: userAddress.toLowerCase() });

    // Generate fresh ephemeral key
    const privateKey = generatePrivateKey();
    const signer = privateKeyToAccount(privateKey);

    // ⚠️ IMPORTANT: This is a PREDICTION of the smart account address
    // The ACTUAL address will be different after MetaMask creates it!
    const predictedSmartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [signer.address, [], [], []],
      deploySalt: "0x",
      signer: { account: signer },
    });

    console.log(`🔮 PREDICTED Smart Account: ${predictedSmartAccount.address}`);
    console.log(`   (This may NOT match the actual address MetaMask creates!)`);

    // Save to database with TEMPORARY smart account address
    const session = await Session.create({
      userWallet: userAddress.toLowerCase(),
      smartAccountAddress: predictedSmartAccount.address.toLowerCase(), // ⚠️ TEMPORARY
      eoaAddress: signer.address.toLowerCase(),
      privateKey: privateKey,
      isActive: false,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
    });

    console.log(`✅ Session created: ${session._id}`);

    return NextResponse.json({ 
      success: true,
      sessionId: session._id, // ✅ Return session ID for later update
      sessionAccountAddress: predictedSmartAccount.address,
    });

  } catch (error: any) {
    console.error("Session Create Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}