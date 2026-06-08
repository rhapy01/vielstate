import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { useShieldCapContract } from "@/hooks/use-shieldcap";
import { sepoliaTxUrl } from "@/lib/explorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, AlertTriangle, CheckCircle2 } from "lucide-react";

export function OwnerDividendPanel() {
  const { address } = useWallet();
  const { isConfigured, readContractOwner, distributeDividend, paymentTokenSymbol } = useShieldCapContract();

  const [isOwner, setIsOwner] = useState(false);
  const [revenueUsdc, setRevenueUsdc] = useState("1000");
  const [revenueUsd, setRevenueUsd] = useState("1000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isConfigured) {
      setIsOwner(false);
      return;
    }
    readContractOwner()
      .then((owner) => setIsOwner(owner?.toLowerCase() === address.toLowerCase()))
      .catch(() => setIsOwner(false));
  }, [address, isConfigured, readContractOwner]);

  if (!isOwner) return null;

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash(null);

    const usd = parseFloat(revenueUsd);
    if (isNaN(usd) || usd <= 0) {
      setError("Enter a positive USD amount for the activity feed");
      return;
    }

    const usdc = parseFloat(revenueUsdc);
    if (isNaN(usdc) || usdc <= 0) {
      setError(`Enter a positive ${paymentTokenSymbol ?? "ctUSDC"} amount`);
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await distributeDividend(1, revenueUsdc, usd);
      setTxHash(receipt.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Banknote className="w-4 h-4 text-emerald-500" />
        Owner: Distribute Dividend
      </div>
      {txHash ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md">
            <a
              href={sepoliaTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-4 py-2 rounded-md border border-primary/30 bg-primary/5 text-xs font-mono text-primary hover:underline break-all"
            >
              View on Etherscan →
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTxHash(null)}
              className="font-mono text-xs shrink-0"
            >
              Distribute Again
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleDistribute} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs text-muted-foreground">
              On-chain revenue ({paymentTokenSymbol ?? "ctUSDC"})
            </Label>
            <Input
              value={revenueUsdc}
              onChange={(e) => setRevenueUsdc(e.target.value)}
              className="font-mono text-xs"
              placeholder="1000"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-xs text-muted-foreground">Recorded revenue (USD)</Label>
            <Input
              type="number"
              min={1}
              value={revenueUsd}
              onChange={(e) => setRevenueUsd(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          {error && (
            <div className="sm:col-span-2 flex items-center gap-2 text-destructive text-xs font-mono">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting} className="font-mono text-xs">
              {isSubmitting ? "Broadcasting..." : "Distribute on Sepolia"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
