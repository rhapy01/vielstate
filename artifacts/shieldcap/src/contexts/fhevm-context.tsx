import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { clearFheDecryptSession } from "@/lib/fhe-decrypt-session";
import { getEthereumProvider } from "@/lib/ethereum-provider";

type FhevmInstance = Awaited<ReturnType<typeof createFhevmInstance>>;

interface FhevmContextType {
  instance: FhevmInstance | null;
  isInitializing: boolean;
  error: string | null;
  reinitialize: () => Promise<void>;
}

const FhevmContext = createContext<FhevmContextType | undefined>(undefined);

async function createFhevmInstance() {
  const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
  await initSDK();
  const network = getEthereumProvider();
  if (!network) {
    throw new Error("Wallet required to initialize FHE SDK");
  }
  return createInstance({
    ...SepoliaConfig,
    network,
  });
}

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const reinitialize = useCallback(async () => {
    if (!address || !getEthereumProvider()) {
      setInstance(null);
      return;
    }
    setIsInitializing(true);
    setError(null);
    try {
      const fhe = await createFhevmInstance();
      setInstance(fhe);
    } catch (err) {
      setInstance(null);
      setError(err instanceof Error ? err.message : "Failed to initialize FHE SDK");
    } finally {
      setIsInitializing(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      clearFheDecryptSession();
      setInstance(null);
      initRef.current = false;
      return;
    }
    if (initRef.current) return;
    initRef.current = true;
    reinitialize().finally(() => {
      initRef.current = false;
    });
  }, [address, reinitialize]);

  return (
    <FhevmContext.Provider value={{ instance, isInitializing, error, reinitialize }}>
      {children}
    </FhevmContext.Provider>
  );
}

export function useFhevm() {
  const context = useContext(FhevmContext);
  if (!context) throw new Error("useFhevm must be used within FhevmProvider");
  return context;
}
