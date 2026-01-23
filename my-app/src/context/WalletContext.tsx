"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "react-hot-toast";
import { type Address } from "viem";

// Define the context type
interface WalletContextType {
  address: string;
  balance: string;
  chainId: string;
  isConnected: boolean;
  isConnecting: boolean;
  isFlask: boolean;
  provider: any | null;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Monad Testnet Chain ID
const MONAD_TESTNET_CHAIN_ID = "0x27a7"; // 10143 in hex

// Provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [chainId, setChainId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isFlask, setIsFlask] = useState<boolean>(false);
  const [provider, setProvider] = useState<any>(null);

  // Find MetaMask Flask provider using EIP-6963
  useEffect(() => {
    let mounted = true;

    const findFlaskProvider = () => {
      if (typeof window === "undefined") return;

      // Handler for EIP-6963 announcements
      const handleAnnouncement = (event: any) => {
        if (!mounted) return;
        
        const { info, provider: announcedProvider } = event.detail;
        
        // Check for Flask by RDNS or legacy flag
        if (info.rdns === 'io.metamask.flask' || announcedProvider.isFlask) {
          console.log("✅ Found MetaMask Flask via EIP-6963");
          setProvider(announcedProvider);
          setIsFlask(true);
        }
      };

      // Listen for provider announcements
      window.addEventListener("eip6963:announceProvider", handleAnnouncement);
      
      // Request providers to announce themselves
      window.dispatchEvent(new Event("eip6963:requestProvider"));

      // Fallback: Check legacy window.ethereum
      setTimeout(() => {
        if (!mounted) return;
        
        const eth = (window as any).ethereum;
        if (eth) {
          if (eth.isFlask) {
            console.log("✅ Found MetaMask Flask via window.ethereum");
            setProvider(eth);
            setIsFlask(true);
          } else if (eth.providers) {
            // Multiple wallets installed
            const flaskProvider = eth.providers.find((p: any) => p.isFlask);
            if (flaskProvider) {
              console.log("✅ Found MetaMask Flask in providers array");
              setProvider(flaskProvider);
              setIsFlask(true);
            }
          }
        }
      }, 500);

      return () => {
        window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
      };
    };

    const cleanup = findFlaskProvider();
    
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (!provider) return;
    
    checkIfWalletIsConnected();
  }, [provider]);

  // Listen for account and chain changes
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log("🔄 Accounts changed:", accounts);
      if (accounts.length === 0) {
        // User disconnected
        disconnect();
      } else if (accounts[0] !== address) {
        // Account switched
        setAddress(accounts[0]);
        updateBalance(accounts[0]);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      console.log("🔄 Chain changed:", newChainId);
      setChainId(newChainId);
      // Reload to avoid any state inconsistencies
      window.location.reload();
    };

    const handleDisconnect = () => {
      console.log("🔌 Provider disconnected");
      disconnect();
    };

    // Add listeners
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);

    // Cleanup listeners
    return () => {
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
        provider.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [provider, address]);

  const checkIfWalletIsConnected = async () => {
    try {
      if (!provider) return;
      
      // Check if already connected (no popup)
      const accounts = await provider.request({ 
        method: "eth_accounts" 
      });
      
      if (accounts.length > 0) {
        const account = accounts[0];
        console.log("✅ Wallet already connected:", account);
        setAddress(account);
        setIsConnected(true);
        
        // Get chain ID
        const chain = await provider.request({ method: "eth_chainId" });
        setChainId(chain);
        
        // Get balance
        await updateBalance(account);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const updateBalance = async (account: string) => {
    try {
      if (!provider) return;
      
      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [account, "latest"],
      });
      
      // Convert hex to decimal and then to ETH
      const balanceWei = BigInt(balanceHex);
      const balanceEth = Number(balanceWei) / 1e18;
      setBalance(balanceEth.toFixed(4));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const connectWallet = async () => {
    if (!provider) {
      toast.error("MetaMask Flask not detected!");
      window.open("https://metamask.io/flask/", "_blank");
      return;
    }

    setIsConnecting(true);
    
    try {
      // Request accounts (triggers MetaMask popup)
      const accounts = await provider.request({ 
        method: "eth_requestAccounts" 
      });
      
      const account = accounts[0];
      setAddress(account);
      setIsConnected(true);
      
      // Get chain ID
      const chain = await provider.request({ method: "eth_chainId" });
      setChainId(chain);
      
      // Get balance
      await updateBalance(account);
      
      // Check if on correct network
      if (chain !== MONAD_TESTNET_CHAIN_ID) {
        toast.error("Please switch to Monad Testnet");
        // Optionally prompt to switch network here
      } else {
        toast.success("Connected to MetaMask Flask!");
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      
      if (error.code === 4001) {
        toast.error("Connection rejected by user");
      } else {
        toast.error("Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress("");
    setBalance("0");
    setChainId("");
    setIsConnected(false);
    toast.success("Wallet disconnected");
  };

  const value: WalletContextType = {
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    isFlask,
    provider,
    connectWallet,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}