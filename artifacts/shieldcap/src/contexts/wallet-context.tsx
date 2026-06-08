import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BrowserProvider, type Signer } from "ethers";
import { SEPOLIA_CHAIN, SEPOLIA_CHAIN_ID } from "@/lib/chain";
import { tryNormalizeEthAddress } from "@/lib/normalize-address";
import {
  getEthereumProvider,
  getWalletProviderLabel,
  startWalletDiscovery,
  type EthereumRequestProvider,
} from "@/lib/ethereum-provider";

interface WalletContextType {
  address: string | null;
  signer: Signer | null;
  provider: BrowserProvider | null;
  chainId: number | null;
  isConnecting: boolean;
  isSwitchingChain: boolean;
  error: string | null;
  walletName: string | null;
  isOnSepolia: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function parseChainId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = value.startsWith("0x") ? parseInt(value, 16) : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function asAccountList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((a): a is string => typeof a === "string");
}

function walletErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as { code?: number; message?: string };
    if (e.code === 4001) return "Network switch was cancelled. Vielstate needs Sepolia testnet.";
    if (typeof e.message === "string") {
      if (
        e.message.includes("Unexpected error") ||
        e.message.includes("selectExtension") ||
        e.message.includes("evmAsk")
      ) {
        return "Wallet extension conflict. Disable Phantom, WELLDONE, and other extra wallets. Use MetaMask only, then refresh.";
      }
      if (e.message.length > 0) return e.message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function requireEthereum(): EthereumRequestProvider {
  startWalletDiscovery();
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error(
      "No compatible wallet found. Install MetaMask and disable Phantom, WELLDONE, and other wallet extensions, then refresh.",
    );
  }
  return provider;
}

async function readChainId(ethereum: EthereumRequestProvider): Promise<number | null> {
  return parseChainId(await ethereum.request({ method: "eth_chainId" }));
}

async function waitForSepolia(ethereum: EthereumRequestProvider, timeoutMs = 12_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await readChainId(ethereum)) === SEPOLIA_CHAIN_ID) return;
    await new Promise((r) => window.setTimeout(r, 250));
  }
  throw new Error("Timed out waiting for Sepolia. Approve the network switch in your wallet.");
}

async function getConnectedAccounts(ethereum: EthereumRequestProvider): Promise<string[]> {
  const accounts = await ethereum.request({ method: "eth_accounts" });
  return asAccountList(accounts);
}

async function requestWalletAccounts(ethereum: EthereumRequestProvider): Promise<string[]> {
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  return asAccountList(accounts);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const switchInFlight = useRef(false);
  const activeEthereum = useRef<EthereumRequestProvider | null>(null);

  const ensureSepolia = useCallback(async (ethereum?: EthereumRequestProvider) => {
    const eth = ethereum ?? activeEthereum.current ?? requireEthereum();

    if ((await readChainId(eth)) === SEPOLIA_CHAIN_ID) return;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN.chainId }],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [SEPOLIA_CHAIN],
        });
      } else if (code === 4001) {
        throw new Error("Network switch was cancelled. Vielstate needs Sepolia testnet.");
      } else {
        throw err;
      }
    }

    await waitForSepolia(eth);
  }, []);

  const syncFromProvider = useCallback(async (ethProvider: BrowserProvider, ethereum: EthereumRequestProvider) => {
    const network = await ethProvider.getNetwork();
    setChainId(Number(network.chainId));

    const accounts = await getConnectedAccounts(ethereum);
    if (accounts.length > 0) {
      const normalized = tryNormalizeEthAddress(accounts[0]);
      setAddress(normalized);
      setSigner(normalized ? await ethProvider.getSigner() : null);
    } else {
      setAddress(null);
      setSigner(null);
    }
  }, []);

  const applySepoliaSwitch = useCallback(
    async (ethereum: EthereumRequestProvider) => {
      if (switchInFlight.current) return;
      if ((await readChainId(ethereum)) === SEPOLIA_CHAIN_ID) {
        const ethProvider = new BrowserProvider(ethereum);
        setProvider(ethProvider);
        await syncFromProvider(ethProvider, ethereum);
        return;
      }

      switchInFlight.current = true;
      setIsSwitchingChain(true);
      setError(null);
      try {
        await ensureSepolia(ethereum);
        const ethProvider = new BrowserProvider(ethereum);
        activeEthereum.current = ethereum;
        setProvider(ethProvider);
        await syncFromProvider(ethProvider, ethereum);
      } catch (err) {
        setError(walletErrorMessage(err, "Could not switch to Sepolia automatically."));
        throw err;
      } finally {
        switchInFlight.current = false;
        setIsSwitchingChain(false);
      }
    },
    [ensureSepolia, syncFromProvider],
  );

  const switchToSepolia = useCallback(async () => {
    const ethereum = activeEthereum.current ?? getEthereumProvider();
    if (!ethereum) {
      setError("Connect a wallet first.");
      return;
    }
    activeEthereum.current = ethereum;
    await applySepoliaSwitch(ethereum);
  }, [applySepoliaSwitch]);

  useEffect(() => {
    startWalletDiscovery();

    const setup = async () => {
      const ethereum = getEthereumProvider();
      if (!ethereum) return;

      activeEthereum.current = ethereum;
      setWalletName(getWalletProviderLabel());

      const accounts = await getConnectedAccounts(ethereum);
      if (accounts.length > 0) {
        try {
          await applySepoliaSwitch(ethereum);
        } catch {
          // Error surfaced via context state.
        }
      } else {
        const ethProvider = new BrowserProvider(ethereum);
        setProvider(ethProvider);
        await syncFromProvider(ethProvider, ethereum);
      }

      const handleAccounts = (accounts: unknown) => {
        const list = asAccountList(accounts);
        if (list.length === 0) {
          setAddress(null);
          setSigner(null);
          setError(null);
          return;
        }

        (async () => {
          try {
            await applySepoliaSwitch(ethereum);
          } catch {
            const normalized = tryNormalizeEthAddress(list[0]);
            setAddress(normalized);
            const ethProvider = new BrowserProvider(ethereum);
            setProvider(ethProvider);
            if (normalized) {
              ethProvider.getSigner().then(setSigner).catch(() => setSigner(null));
            } else {
              setSigner(null);
            }
          }
        })();
      };

      const handleChain = () => {
        (async () => {
          const ethProvider = new BrowserProvider(ethereum);
          setProvider(ethProvider);
          await syncFromProvider(ethProvider, ethereum);
          const connected = await getConnectedAccounts(ethereum);
          if (connected.length > 0 && (await readChainId(ethereum)) !== SEPOLIA_CHAIN_ID) {
            await applySepoliaSwitch(ethereum).catch(() => undefined);
          }
        })().catch(() => undefined);
      };

      ethereum.on?.("accountsChanged", handleAccounts);
      ethereum.on?.("chainChanged", handleChain);

      return () => {
        ethereum.removeListener?.("accountsChanged", handleAccounts);
        ethereum.removeListener?.("chainChanged", handleChain);
      };
    };

    let cleanup: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      setup().then((fn) => {
        cleanup = fn;
      }).catch(() => undefined);
    }, 100);

    return () => {
      window.clearTimeout(timer);
      cleanup?.();
    };
  }, [applySepoliaSwitch, syncFromProvider]);

  useEffect(() => {
    if (!address || chainId === SEPOLIA_CHAIN_ID || !activeEthereum.current) return;
    applySepoliaSwitch(activeEthereum.current).catch(() => undefined);
  }, [address, chainId, applySepoliaSwitch]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const ethereum = requireEthereum();
      activeEthereum.current = ethereum;
      setWalletName(getWalletProviderLabel());

      const accounts = await requestWalletAccounts(ethereum);
      if (!accounts.length) {
        setError("No wallet account selected.");
        return;
      }

      await applySepoliaSwitch(ethereum);
    } catch (err: unknown) {
      setError(walletErrorMessage(err, "Failed to connect wallet"));
    } finally {
      setIsConnecting(false);
    }
  }, [applySepoliaSwitch]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setError(null);
  }, []);

  const isOnSepolia = chainId === SEPOLIA_CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        address,
        signer,
        provider,
        chainId,
        isConnecting,
        isSwitchingChain,
        error,
        walletName,
        isOnSepolia,
        connect,
        disconnect,
        switchToSepolia,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}

export function useIsCorrectNetwork() {
  const { isOnSepolia, isSwitchingChain, isConnecting } = useWallet();
  if (isSwitchingChain || isConnecting) return false;
  return isOnSepolia;
}

export function useEthereumProvider(): EthereumRequestProvider | null {
  const [ethereum, setEthereum] = useState<EthereumRequestProvider | null>(() => getEthereumProvider());

  useEffect(() => {
    startWalletDiscovery();
    const timer = window.setTimeout(() => setEthereum(getEthereumProvider()), 150);
    return () => window.clearTimeout(timer);
  }, []);

  return ethereum;
}
