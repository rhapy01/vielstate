import { useState } from "react";
import { useWallet, useIsCorrectNetwork } from "@/contexts/wallet-context";
import { useFhevm } from "@/contexts/fhevm-context";
import { useShieldCapContract } from "@/hooks/use-shieldcap";
import { useRegisterInvestor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { sepoliaTxUrl } from "@/lib/explorer";
import { TestTokenClaimPanel } from "@/components/test-token-claim-panel";

export default function Purchase() {
  const { address, connect, isConnecting, isSwitchingChain, error: walletError } = useWallet();
  const isCorrectNetwork = useIsCorrectNetwork();
  const { instance, error: fheError } = useFhevm();
  const { isConfigured, configError, purchaseShares, paymentTokenSymbol } = useShieldCapContract();
  const registerInvestor = useRegisterInvestor();

  const [shareAmount, setShareAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");

  const tokenLabel = paymentTokenSymbol ?? "tUSDC";

  const handleConnect = async () => {
    await connect();
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setTxHash(null);

    const amount = parseInt(shareAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("Enter a positive share count");
      return;
    }

    if (!address) return;

    setIsSubmitting(true);
    try {
      if (address) {
        await registerInvestor.mutateAsync({ data: { walletAddress: address } });
      }
      const receipt = await purchaseShares(1, amount);
      setTxHash(receipt.hash);
      setShareAmount("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold font-mono">Purchase Shares</h1>
        <p className="text-muted-foreground text-sm text-center">Connect your wallet to purchase shares.</p>
        <TestTokenClaimPanel />
        <Button onClick={handleConnect} disabled={isConnecting} className="font-mono">
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {walletError && <p className="text-destructive text-xs font-mono">{walletError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">Purchase Shares</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1">
          {tokenLabel} · 1 per share
        </p>
      </div>

      <TestTokenClaimPanel />

      {!isCorrectNetwork && (
        <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/25 rounded-md text-xs font-mono text-muted-foreground">
          <AlertTriangle className="w-4 h-4 shrink-0 text-primary" />
          {isSwitchingChain
            ? "Switching your wallet to Sepolia automatically..."
            : walletError ?? "Confirm the Sepolia network switch in your wallet popup."}
        </div>
      )}

      {!isConfigured && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-500" />
          Share purchases are temporarily unavailable. Please check back soon or contact support.
          {configError && <span className="block mt-1 text-muted-foreground">{String(configError)}</span>}
        </div>
      )}

      {fheError && <p className="text-destructive text-xs font-mono">{fheError}</p>}

      {txHash ? (
        <div className="p-6 bg-card border border-border rounded-lg space-y-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
          <div className="font-mono font-bold text-primary">Purchase Submitted</div>
          <a
            href={sepoliaTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
          >
            View on Etherscan
            <ExternalLink className="w-3 h-3" />
          </a>
          <Button variant="outline" onClick={() => setTxHash(null)} className="font-mono text-xs">
            Purchase More
          </Button>
        </div>
      ) : (
        <form onSubmit={handlePurchase} className="p-6 bg-card border border-border rounded-lg space-y-5">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs text-muted-foreground">Share Amount</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 100"
              value={shareAmount}
              onChange={(e) => setShareAmount(e.target.value)}
              className="font-mono"
            />
          </div>

          {submitError && (
            <div className="flex items-center gap-2 text-destructive text-xs font-mono">
              <AlertTriangle className="w-3 h-3" />
              {submitError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !isConfigured || !instance || !isCorrectNetwork}
            className="w-full font-mono"
          >
            {isSubmitting ? "Purchasing..." : `Purchase with ${tokenLabel}`}
          </Button>
        </form>
      )}

    </div>
  );
}
