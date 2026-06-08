import { Link } from "wouter";
import { Shield, AlertTriangle } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { useIsContractOwner } from "@/hooks/use-is-contract-owner";
import { OwnerDividendPanel } from "@/components/owner-dividend-panel";
import { CreatePropertyPanel } from "@/components/create-property-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Admin() {
  const { address, connect, isConnecting } = useWallet();
  const { isOwner, isLoading } = useIsContractOwner();

  if (!address) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <Shield className="w-10 h-10 text-primary mx-auto" />
        <div>
          <h1 className="text-2xl font-bold font-mono">Contract Admin</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Connect the deployer wallet to manage properties and dividend rounds.
          </p>
        </div>
        <Button onClick={() => void connect()} disabled={isConnecting} className="font-mono text-xs">
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-bold font-mono">Access restricted</h1>
        <p className="text-sm text-muted-foreground font-mono">
          Only the ShieldCap contract owner can use this page. Your wallet is not the on-chain admin.
        </p>
        <Link href="/portfolio">
          <span className="text-primary text-xs font-mono hover:underline cursor-pointer">← Back to Portfolio</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contract Admin</h1>
        <p className="text-muted-foreground text-sm mt-1 font-mono">
          Owner-only tools for primary listings and dividend distribution. Personal portfolio data lives on Portfolio.
        </p>
      </div>

      <CreatePropertyPanel />
      <OwnerDividendPanel />
    </div>
  );
}
