/**
 * Network utility functions for managing chain switching
 */

export const MONAD_TESTNET_CONFIG = {
  chainId: "0x279f", // 10143 is 0x279f (Fixing the hex value)
  chainName: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: ["https://monad-testnet.drpc.org/"],
  blockExplorerUrls: ["https://testnet.monadvision.com/"], // Updated to the active explorer
};

/**
 * Switch to Monad Testnet
 */
export async function switchToMonadTestnet(provider: any) {
  if (!provider) {
    throw new Error("No provider available");
  }

  try {
    // Try to switch to the network
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_TESTNET_CONFIG.chainId }],
    });
    
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network to MetaMask
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [MONAD_TESTNET_CONFIG],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add network:", addError);
        throw new Error("Failed to add Monad Testnet to MetaMask");
      }
    } else {
      console.error("Failed to switch network:", switchError);
      throw switchError;
    }
  }
}

/**
 * Check if currently on Monad Testnet
 */
export function isMonadTestnet(chainId: string): boolean {
  return chainId === MONAD_TESTNET_CONFIG.chainId;
}

/**
 * Format chain ID for display
 */
export function formatChainId(chainId: string): string {
  try {
    const decimal = parseInt(chainId, 16);
    return decimal.toString();
  } catch {
    return chainId;
  }
}