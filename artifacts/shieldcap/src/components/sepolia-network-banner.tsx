import { useWallet } from "@/contexts/wallet-context";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

/** Shown when wallet is connected but not on Sepolia yet. */
export function SepoliaNetworkBanner() {
  const { address, isOnSepolia, isSwitchingChain, isConnecting, switchToSepolia, error } = useWallet();

  if (!address || isOnSepolia || isConnecting) return null;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1 text-xs font-mono text-muted-foreground">
        {isSwitchingChain ? (
          <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        )}
        <span>
          {isSwitchingChain
            ? "Switching your wallet to Sepolia automatically..."
            : "This app runs on Sepolia testnet. We will switch your wallet for you."}
        </span>
      </div>
      {!isSwitchingChain && (
        <Button size="sm" variant="outline" onClick={() => void switchToSepolia()} className="font-mono text-xs shrink-0">
          Switch to Sepolia
        </Button>
      )}
      {error && !isSwitchingChain && (
        <p className="text-xs font-mono text-destructive sm:basis-full">{error}</p>
      )}
    </div>
  );
}
