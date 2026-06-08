import { useState, useEffect } from "react";
import { useWallet, useIsCorrectNetwork } from "@/contexts/wallet-context";
import { useFhevm } from "@/contexts/fhevm-context";
import { useShieldCapContract, formatTxError } from "@/hooks/use-shieldcap";
import { invalidateFheDecryptCache } from "@/lib/fhe-decrypt-session";
import { useQueryClient } from "@tanstack/react-query";
import { useRegisterInvestor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, ExternalLink, Wallet } from "lucide-react";
import { sepoliaTxUrl } from "@/lib/explorer";
import { usePropertyShareSupply, type PropertyListing } from "@/hooks/use-marketplace";

type PurchaseSharesPanelProps = {
  property?: PropertyListing;
  compact?: boolean;
  className?: string;
};

export function PurchaseSharesPanel({ property, compact = false, className = "" }: PurchaseSharesPanelProps) {
  const { address, signer, connect, isConnecting, isSwitchingChain, error: walletError } = useWallet();
  const isCorrectNetwork = useIsCorrectNetwork();
  const { instance, error: fheError } = useFhevm();
  const { isConfigured, configError, purchaseShares, paymentTokenSymbol, readUsdcBalance } = useShieldCapContract();
  const registerInvestor = useRegisterInvestor();
  const queryClient = useQueryClient();

  const [shareAmount, setShareAmount] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  const { data: supply } = usePropertyShareSupply(property?.id);
  const tokenLabel = paymentTokenSymbol ?? "ctUSDC";
  const pricePerShare = property?.pricePerShare ?? 1;
  const parsedShares = parseInt(shareAmount, 10);
  const totalCost = !isNaN(parsedShares) && parsedShares > 0 ? parsedShares * pricePerShare : 0;
  const sharesRemaining = supply?.sharesRemaining;

  useEffect(() => {
    if (!address || !signer || !instance) {
      setUsdcBalance(null);
      return;
    }
    void readUsdcBalance().then(setUsdcBalance).catch(() => setUsdcBalance(null));
  }, [address, signer, instance, readUsdcBalance, txHash]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setTxHash(null);

    const amount = parseInt(shareAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("Enter a positive share count");
      return;
    }
    if (!address || !property) return;

    if (sharesRemaining !== undefined && amount > sharesRemaining) {
      setSubmitError(
        sharesRemaining === 0
          ? "No shares left on this listing — primary supply is fully allocated."
          : `Only ${sharesRemaining.toLocaleString()} share${sharesRemaining === 1 ? "" : "s"} available.`,
      );
      return;
    }

    const balanceNum = parseFloat(usdcBalance ?? "0");
    if (totalCost > balanceNum) {
      setSubmitError(`Insufficient ${tokenLabel} balance (need ${totalCost}, have ${balanceNum || 0}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerInvestor.mutateAsync({ data: { walletAddress: address } });
      const receipt = await purchaseShares(property.id, amount);
      invalidateFheDecryptCache();
      setTxHash(receipt.hash);
      void queryClient.invalidateQueries({ queryKey: ["property-share-supply", property.id] });
    } catch (err) {
      setSubmitError(formatTxError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className}`}>
        <p className="text-xs font-mono text-muted-foreground">Connect your wallet to buy shares.</p>
        <Button size="sm" onClick={() => void connect()} disabled={isConnecting} className="w-full font-mono text-xs gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {walletError && <p className="text-xs font-mono text-destructive">{walletError}</p>}
      </div>
    );
  }

  if (txHash) {
    return (
      <div className={`rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col items-center gap-3 text-center ${className}`}>
        <CheckCircle2 className="w-8 h-8 text-primary" />
        <p className="font-mono font-bold text-sm text-primary">Purchase submitted</p>
        <a
          href={sepoliaTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
        >
          View on Etherscan
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTxHash(null)}
          className="font-mono text-xs w-full max-w-xs"
        >
          Buy more shares
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handlePurchase} className={`rounded-xl border border-border bg-card p-4 space-y-4 ${className}`}>
      {!compact && (
        <div>
          <h3 className="font-bold text-sm">Buy shares</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pricePerShare} {tokenLabel} per share
          </p>
        </div>
      )}

      {usdcBalance !== null && (
        <p className="text-xs font-mono text-muted-foreground">
          Your balance: <span className="text-foreground font-bold">{usdcBalance} {tokenLabel}</span>
        </p>
      )}

      {!isCorrectNetwork && (
        <div className="flex items-start gap-2 text-xs font-mono text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-primary" />
          {isSwitchingChain
            ? "Switching to Sepolia..."
            : walletError ?? "Confirm the Sepolia network switch in your wallet."}
        </div>
      )}

      {!isConfigured && (
        <div className="flex items-start gap-2 text-xs font-mono text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Contract not configured. Purchases unavailable.
          {configError && <span className="block mt-1">{String(configError)}</span>}
        </div>
      )}

      {fheError && <p className="text-destructive text-xs font-mono">{fheError}</p>}

      <div className="space-y-1.5">
        <Label className="font-mono text-xs text-muted-foreground">Shares to buy</Label>
        <Input
          type="number"
          min={1}
          value={shareAmount}
          onChange={(e) => setShareAmount(e.target.value)}
          className="font-mono text-sm"
        />
        {sharesRemaining !== undefined && (
          <p className="text-xs font-mono text-muted-foreground">
            Available: <span className="text-foreground font-bold">{sharesRemaining.toLocaleString()}</span>
            {supply?.hasUntrackedPurchases && supply.sharesSold === 0 ? " (est.)" : ""}
          </p>
        )}
        {totalCost > 0 && (
          <p className="text-xs font-mono text-muted-foreground">
            Total: <span className="text-foreground font-bold">{totalCost} {tokenLabel}</span>
          </p>
        )}
      </div>

      {submitError && (
        <div className="flex items-center gap-2 text-destructive text-xs font-mono">
          <AlertTriangle className="w-3 h-3" />
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !isConfigured || !instance || !isCorrectNetwork || !property}
        className="w-full font-mono text-xs"
        size={compact ? "sm" : "default"}
      >
        {isSubmitting ? "Purchasing..." : `Buy ${shareAmount || "…"} shares`}
      </Button>
    </form>
  );
}
