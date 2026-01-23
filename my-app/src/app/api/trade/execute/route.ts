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
  try {
    const { userWallet, amount } = await req.json();
    
    console.log(`\n🎯 Auto-Trade Request (USDC Transfer):`);
    console.log(`   User: ${userWallet}`);
    console.log(`   Amount: ${amount} USDC`);

    await dbConnect();

    // 1. Look up session
    const session = await Session.findOne({ 
      userWallet: userWallet.toLowerCase(), 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!session) {
      return NextResponse.json({ error: "No active session found." }, { status: 403 });
    }

    if (!session.permissionsContext || !session.delegationManager) {
      return NextResponse.json({ error: "Session missing permissions." }, { status: 400 });
    }

    // 2. Recreate session account
    console.log(`\n📂 Recreating session account...`);
    const signer = privateKeyToAccount(session.privateKey as `0x${string}`);
    
    const sessionAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [signer.address, [], [], []],
      deploySalt: "0x",
      signer: { account: signer },
    });
    
    console.log(`   ✅ Session account: ${sessionAccount.address}`);

    const bundler = getBundlerClient();

    // 3. Prepare Transfer Data
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

    // 4. Fetch Dynamic Gas Prices & ADD BUFFER
    console.log(`\n⛽ Fetching dynamic gas prices...`);
    
    const feeData = await publicClient.estimateFeesPerGas();
    
    // Get base values
    let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || 3000000000n;
    let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 2000000000n;

    console.log(`   Raw Estimate: ${maxFeePerGas} wei`);

    // 🚀 APPLY 2x BUFFER (Safety factor for Bundler requirements)
    // 122 Gwei * 2 = 244 Gwei (This satisfies the 152 Gwei requirement)
    maxFeePerGas = (maxFeePerGas * 200n) / 100n;
    maxPriorityFeePerGas = (maxPriorityFeePerGas * 200n) / 100n;

    console.log(`   Buffered Max Fee: ${maxFeePerGas} wei`);

    // 5. Execute
    console.log(`\n⚡ Sending USDC Transfer UserOp...`);
    
    const userOpHash = await bundler.sendUserOperationWithDelegation({
      account: sessionAccount,
      calls,
      publicClient,
      entryPointAddress: ENTRYPOINT_ADDRESS_V07,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log(`   ✅ UserOp submitted: ${userOpHash}`);

    // 6. Wait for receipt
    let txHash: string | undefined;
    try {
      console.log(`   ⏳ Waiting for confirmation...`);
      const receipt = await bundler.waitForUserOperationReceipt({ hash: userOpHash });
      txHash = receipt.receipt.transactionHash;
      console.log(`   ✅ Transfer confirmed: ${txHash}`);
    } catch (e) {
      console.warn("   ⚠️ Receipt wait timed out, but trade may still succeed");
      txHash = userOpHash;
    }

    return NextResponse.json({ 
      success: true, 
      txHash: txHash,
      positionId: Date.now(),
    });

  } catch (error: any) {
    console.error("\n❌ Auto-Trade Failed:", error);
    return NextResponse.json({ 
      error: error.message || "Trade execution failed",
      details: error.toString()
    }, { status: 500 });
  }
}