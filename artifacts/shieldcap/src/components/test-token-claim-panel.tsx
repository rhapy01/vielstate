import { useWallet } from "@/contexts/wallet-context";
import { useTestTokenClaim } from "@/hooks/use-test-token-claim";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Coins, Loader2, Wallet } from "lucide-react";

type TestTokenClaimPanelProps = {
  variant?: "full" | "compact";
  className?: string;
};

export function TestTokenClaimPanel({ variant = "full", className = "" }: TestTokenClaimPanelProps) {
  const { address, connect, isConnecting, error: walletError } = useWallet();
  const {
    tokenLabel,
    usdcBalance,
    isCorrectNetwork,
    isConfigured,
    isSwitchingChain,
    loading,
    message,
    error,
    claimUsdc,
  } = useTestTokenClaim();

  if (!address) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
        <p className="text-xs font-mono text-muted-foreground mb-3">Connect your wallet to claim {tokenLabel}.</p>
        <Button size="sm" onClick={() => void connect()} disabled={isConnecting} className="font-mono text-xs gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {walletError && <p className="text-xs font-mono text-destructive mt-2">{walletError}</p>}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        {usdcBalance !== null && (
          <p className="text-xs font-mono text-foreground">
            {usdcBalance} {tokenLabel}
          </p>
        )}
        <Button
          type="button"
          size="sm"
          onClick={() => void claimUsdc()}
          disabled={loading || isSwitchingChain || !isConfigured}
          className="w-full font-mono text-[10px] h-8 gap-1"
        >
          <Coins className="w-3 h-3" />
          {loading || isSwitchingChain ? "Claiming..." : `Claim ${tokenLabel}`}
        </Button>
        {message && <p className="text-[10px] font-mono text-primary leading-snug">{message}</p>}
        {error && <p className="text-[10px] font-mono text-destructive leading-snug">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Coins className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">Claim {tokenLabel}</h3>
          {usdcBalance !== null && (
            <p className="text-xs font-mono mt-2 text-foreground">
              Balance: <span className="text-primary font-bold">{usdcBalance}</span>
            </p>
          )}
        </div>
      </div>

      {!isCorrectNetwork && isSwitchingChain && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          Switching to Sepolia...
        </div>
      )}

      {!isConfigured && isCorrectNetwork && (
        <div className="flex items-center gap-2 text-xs font-mono text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Loading contract config. Try again shortly.
        </div>
      )}

      <Button
        type="button"
        onClick={() => void claimUsdc()}
        disabled={loading || isSwitchingChain || !isConfigured}
        className="font-mono text-xs gap-1.5 w-full sm:w-auto"
        data-testid="button-claim-usdc"
      >
        <Coins className="w-3.5 h-3.5" />
        {loading || isSwitchingChain ? "Claiming..." : `Claim ${tokenLabel}`}
      </Button>

      {message && <p className="text-xs font-mono text-primary">{message}</p>}
      {error && <p className="text-xs font-mono text-destructive">{error}</p>}
    </div>
  );
}
