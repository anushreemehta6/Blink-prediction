import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Session from '@/lib/db/models/Session';
import { getBundlerClient, publicClient } from '@/lib/flask/bundler'; 
import { privateKeyToAccount } from "viem/accounts";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/smart-accounts-kit";
import { 
  encodeFunctionData, 
  parseUnits,
  parseAbi,
  type Hex,
  type Address
} from 'viem';

const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;
const USDC_ADDRESS = "0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6" as Address;
const THIRTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS as Address;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { userWallet, amount } = await req.json();
    
    console.log(`\n⚡ FAST MODE Trade: ${userWallet.slice(0, 8)}... | $${amount}`);

    await dbConnect();

    // 1. Quick session lookup
    const session = await Session.findOne({ 
      userWallet: userWallet.toLowerCase(), 
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).lean(); // Use lean() for faster queries
    
    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 403 });
    }

    if (!session.permissionsContext || !session.delegationManager) {
      return NextResponse.json({ error: "Missing permissions" }, { status: 400 });
    }

    // 2. Recreate session account (cached in memory for production)
    const signer = privateKeyToAccount(session.privateKey as `0x${string}`);
    
    const sessionAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [signer.address, [], [], []],
      deploySalt: "0x",
      signer: { account: signer },
    });

    const bundler = getBundlerClient();

    // 3. Prepare Transfer
    const amountInUSDC = parseUnits(amount.toString(), 6);

    const transferCallData = encodeFunctionData({
      abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
      functionName: 'transfer',
      args: [THIRTY_CONTRACT_ADDRESS, amountInUSDC]
    });

    const calls = [{
      to: USDC_ADDRESS,
      data: transferCallData,
      value: 0n,
      permissionsContext: session.permissionsContext as Hex,
      delegationManager: session.delegationManager as Address,
    }];

    // 4. Fetch gas prices with 2x buffer
    const feeData = await publicClient.estimateFeesPerGas();
    let maxFeePerGas = (feeData.maxFeePerGas || 3000000000n) * 2n;
    let maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas || 2000000000n) * 2n;

    console.log(`   ⛽ Gas: ${maxFeePerGas / 1000000000n} Gwei`);

    // 5. 🚀 SEND TRANSACTION (Don't wait for confirmation)
    const userOpHash = await bundler.sendUserOperationWithDelegation({
      account: sessionAccount,
      calls,
      publicClient,
      entryPointAddress: ENTRYPOINT_ADDRESS_V07,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Submitted in ${elapsed}ms: ${userOpHash.slice(0, 12)}...`);

    // 🎯 RETURN IMMEDIATELY - Don't wait for receipt!
    // The bot will detect and settle the position automatically
    return NextResponse.json({ 
      success: true, 
      txHash: userOpHash,
      positionId: Date.now(),
      executionTime: elapsed
    });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Failed after ${elapsed}ms:`, error.message);
    
    return NextResponse.json({ 
      error: error.message || "Trade failed",
      executionTime: elapsed
    }, { status: 500 });
  }
}