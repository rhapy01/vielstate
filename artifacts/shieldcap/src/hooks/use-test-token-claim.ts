import { useCallback, useEffect, useState } from "react";
import { useWallet, useIsCorrectNetwork } from "@/contexts/wallet-context";
import { useFhevm } from "@/contexts/fhevm-context";
import { useShieldCapContract } from "@/hooks/use-shieldcap";
import { invalidateFheDecryptCache } from "@/lib/fhe-decrypt-session";
import { requestTestUsdc } from "@/lib/test-faucet";

export function useTestTokenClaim() {
  const { address, signer, isOnSepolia, switchToSepolia, isSwitchingChain } = useWallet();
  const isCorrectNetwork = useIsCorrectNetwork();
  const { instance, isInitializing: isFheInitializing } = useFhevm();
  const { readUsdcBalance, paymentTokenSymbol, paymentTokenAddress, isConfigured } = useShieldCapContract();

  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tokenLabel = paymentTokenSymbol ?? "tUSDC";

  const refreshBalance = useCallback(async () => {
    if (!address || !isConfigured || !signer || !instance) {
      setUsdcBalance(null);
      return;
    }
    try {
      const balance = await readUsdcBalance();
      setUsdcBalance(balance);
    } catch {
      setUsdcBalance(null);
    }
  }, [address, signer, instance, isConfigured, readUsdcBalance]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const claimUsdc = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!isOnSepolia) {
        await switchToSepolia();
      }
      const result = await requestTestUsdc(address);
      invalidateFheDecryptCache();
      setMessage(result.message);
      await refreshBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(false);
    }
  }, [address, isOnSepolia, switchToSepolia, refreshBalance]);

  return {
    tokenLabel,
    paymentTokenAddress,
    usdcBalance,
    isCorrectNetwork,
    isConfigured,
    isFheInitializing,
    isSwitchingChain,
    loading,
    message,
    error,
    claimUsdc,
    refreshBalance,
  };
}
