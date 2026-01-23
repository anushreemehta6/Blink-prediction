'use client';

import { useState } from 'react';
import { createWalletClient, custom, parseUnits, type Address } from 'viem';
import { monadTestnet } from '@/lib/chains'; 
import { toast } from 'react-hot-toast';
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions';
import { dice } from '@/assets';
import Image from 'next/image';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const THIRTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS as `0x${string}`;
const USDC_ADDRESS = "0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6";

export default function AutoTradeSetup({ userAddress, onEnabled }: { userAddress: string, onEnabled: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (!userAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      toast.error("MetaMask Flask is required");
      window.open("https://metamask.io/flask/", "_blank");
      return;
    }

    setLoading(true);

    try {
      // ===== STEP 1: Create Session Account (Server-Side) =====
      console.log("=== STEP 1: Creating session account ===");
      toast.loading("Creating session account...", { id: "setup" });

      const sessionRes = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress }),
      });

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create session");
      }

      const { sessionAccountAddress, sessionId } = await sessionRes.json();
      
      if (!sessionAccountAddress) {
        throw new Error("Invalid session account address received");
      }

      console.log("✅ Session account:", sessionAccountAddress);

      // ===== STEP 2: Create Wallet Client with ERC-7715 Actions =====
      console.log("\n=== STEP 2: Creating wallet client ===");
      toast.loading("Connecting to MetaMask...", { id: "setup" });

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum),
        account: userAddress as `0x${string}`,
      }).extend(erc7715ProviderActions());

      console.log("✅ Wallet client created");

      // ===== STEP 3: Request ERC20 Token Permissions for USDC =====
      console.log("\n=== STEP 3: Requesting ERC20 Token Permissions ===");
      toast.loading("Please approve USDC spending permission in MetaMask Flask...", { id: "setup" });

      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + (30 * 24 * 60 * 60); // 30 days

      // ✅ Use erc20-token-periodic for USDC spending
      const grantedPermissions = await walletClient.requestExecutionPermissions([{
        chainId: monadTestnet.id,
        expiry,
        signer: {
          type: "account",
          data: {
            address: sessionAccountAddress,
          },
        },
     permission: {
          type: "erc20-token-periodic",
          data: {
            tokenAddress: USDC_ADDRESS,
            periodAmount: parseUnits("10000", 6),
            
            // ✅ Fix 1: TypeScript requires 'periodDuration'
            periodDuration: 86400, 
            
            // ✅ Fix 2: TypeScript requires 'startTime'
            startTime: currentTime,
            
            recipient: THIRTY_CONTRACT_ADDRESS,
          },
        },
        isAdjustmentAllowed: true,
      }]);

      console.log("✅ Permissions Granted:", grantedPermissions);

      if (!grantedPermissions || grantedPermissions.length === 0) {
        throw new Error("Permission request denied or failed");
      }

      toast.dismiss("setup");

      // ===== STEP 4: Extract Permission Data =====
      console.log("\n=== STEP 4: Extracting permission data ===");
      const permissionData = grantedPermissions[0];
      const permissionsContext = permissionData.context;
      const delegationManager = permissionData.signerMeta?.delegationManager;
      const userSmartAccountAddress = permissionData.address;

      if (!permissionsContext) {
        throw new Error("Missing permissions context in response");
      }

      console.log("✅ Permission context:", permissionsContext);
      console.log("✅ Delegation manager:", delegationManager || 'NONE');
      console.log("✅ User smart account:", userSmartAccountAddress);

      // ===== STEP 5: Save Permission to Database =====
      console.log("\n=== STEP 5: Saving permission to database ===");
      toast.loading("Saving permission...", { id: "setup" });

      const enableRes = await fetch("/api/session/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          context: permissionsContext,
          delegationManager: delegationManager || "",
          smartAccountAddress: userSmartAccountAddress,
        }),
      });

      const enableData = await enableRes.json();
      if (!enableData.success) {
        throw new Error(enableData.error || "Failed to save permission");
      }

      toast.success("🚀 Auto-Trade Enabled! You can now trade with USDC.", { id: "setup" });
      console.log("✅ Setup complete!");
      onEnabled();

    } catch (e: any) {
      console.error("Setup Error:", e);
      
      if (e.code === 4001 || e.message?.includes("User rejected")) {
        toast.error("Setup cancelled by user", { id: "setup" });
      } else if (e.code === -32601 || e.message?.includes("does not exist") || e.message?.includes("not available")) {
        toast.error(
          "⚠️ MetaMask Flask doesn't support ERC-7715 yet. Please update to the latest version.",
          { id: "setup", duration: 6000 }
        );
      } else if (e.message?.includes("chain")) {
        toast.error("Wrong network. Please switch to Monad Testnet.", { id: "setup" });
      } else {
        toast.error(`Setup failed: ${e.message || "Unknown error"}`, { id: "setup" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSetup} 
      disabled={loading}
      className="bg-gradient-to-r from-[#599BA5] to-[#A1BCBD] text-black disabled:bg-gray-400 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg"
    >
      {loading ? (
        <>
          <span className="animate-spin">⚙️</span>
          Setting up...
        </>
      ) : (
        <> <Image src={dice} alt="dice"/> <h1 className='text-xl'>Go 1-Tap</h1>  </>
      )}
    </button>
  );
}