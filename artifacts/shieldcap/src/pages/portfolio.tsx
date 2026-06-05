import { useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import {
  useGetInvestorProfile, getGetInvestorProfileQueryKey,
  useGetInvestorTransactions, getGetInvestorTransactionsQueryKey,
  useGetInvestorDividends, getGetInvestorDividendsQueryKey,
  useRegisterInvestor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { EncryptedValue } from "@/components/encrypted-value";
import { formatDate, formatCurrency } from "@/lib/format";
import { Shield, Wallet, Lock, TrendingUp, Activity, Banknote, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const SIMULATED_SHARES = 8450;
const TOTAL_SHARES = 50000;
const PRICE_PER_SHARE = 100;
const MAX_OWNERSHIP_BPS = 2000; // 20%

const EVENT_TYPE_STYLES: Record<string, string> = {
  Purchase: "text-primary border-primary/30 bg-primary/10",
  Transfer: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  DividendDistribution: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  CapRejected: "text-destructive border-destructive/30 bg-destructive/10",
};

export default function Portfolio() {
  const { address, connect } = useWallet();
  const queryClient = useQueryClient();
  const registerInvestor = useRegisterInvestor();

  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { data: profile, isLoading: profileLoading } = useGetInvestorProfile(
    address ?? "",
    { query: { enabled: !!address, queryKey: getGetInvestorProfileQueryKey(address ?? "") } }
  );
  const { data: transactions, isLoading: txLoading } = useGetInvestorTransactions(
    address ?? "",
    { query: { enabled: !!address, queryKey: getGetInvestorTransactionsQueryKey(address ?? "") } }
  );
  const { data: dividendRecords, isLoading: divLoading } = useGetInvestorDividends(
    address ?? "",
    { query: { enabled: !!address, queryKey: getGetInvestorDividendsQueryKey(address ?? "") } }
  );

  const handleConnect = () => {
    connect();
    setTimeout(() => {
      registerInvestor.mutate(
        { data: { walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetInvestorProfileQueryKey("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") });
          }
        }
      );
    }, 100);
  };

  const handleDecrypt = () => {
    setIsDecrypting(true);
    setTimeout(() => {
      setIsDecrypting(false);
      setIsDecrypted(true);
    }, 2200);
  };

  const ownershipPct = (SIMULATED_SHARES / TOTAL_SHARES) * 100;
  const portfolioValue = SIMULATED_SHARES * PRICE_PER_SHARE;
  const isNearCap = ownershipPct > 15;

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono">Private Portfolio</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Connect your wallet to access your encrypted portfolio. Your balances, share counts, and dividend payouts are stored using FHE — only you can decrypt them.
          </p>
        </div>
        <div className="p-6 bg-card border border-border rounded-lg max-w-sm w-full space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="font-mono text-sm font-bold text-primary">Privacy-First</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">
                Your holdings are encrypted on-chain via Zama fhEVM. No one — not the contract, not the platform — can read your balance without your cryptographic key.
              </div>
            </div>
          </div>
          <Button onClick={handleConnect} className="w-full font-mono" data-testid="button-connect-wallet">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">Private Portfolio</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1">{address}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded text-xs font-mono text-primary">
          <Shield className="w-3 h-3" />
          FHE Protected
        </div>
      </div>

      {/* Encrypted balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <EncryptedValue
            value={`${SIMULATED_SHARES.toLocaleString()} shares`}
            label="Your Share Balance"
            isDecrypted={isDecrypted}
            onDecrypt={handleDecrypt}
            isDecrypting={isDecrypting}
          />
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="text-xs font-mono text-muted-foreground mb-1">Portfolio Value</div>
            <div className={`text-xl font-mono font-bold transition-all duration-1000 ${isDecrypted ? "" : "blur-sm select-none"}`}>
              {isDecrypted ? formatCurrency(portfolioValue) : formatCurrency(portfolioValue)}
            </div>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="text-xs font-mono text-muted-foreground mb-1">Ownership</div>
            <div className={`text-xl font-mono font-bold transition-all duration-1000 ${isDecrypted ? "" : "blur-sm select-none"}`}>
              {isDecrypted ? `${ownershipPct.toFixed(2)}%` : "–"}
            </div>
          </div>
        </div>
      </div>

      {/* Cap warning */}
      {isDecrypted && isNearCap && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md animate-in slide-in-from-bottom-2 duration-300">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm font-mono">
            <span className="text-yellow-400 font-bold block">Approaching Ownership Cap</span>
            <span className="text-muted-foreground text-xs">
              You own {ownershipPct.toFixed(2)}% of total shares. The protocol enforces a 20% maximum. Any purchase exceeding this cap will be rejected via FHE comparison.
            </span>
          </div>
        </div>
      )}

      {/* Stats row */}
      {profileLoading ? (
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : profile && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<Activity />} label="Transactions" value={profile.transactionCount.toString()} />
          <StatCard icon={<Banknote />} label="Dividend Rounds" value={profile.dividendRoundsParticipated.toString()} />
          <StatCard icon={<TrendingUp />} label="Member Since" value={formatDate(profile.registeredAt).split(",")[0]} />
        </div>
      )}

      {/* Transaction history */}
      <section>
        <h2 className="font-mono font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Your Transactions</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          {txLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : transactions?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">No transactions recorded yet</div>
          ) : (
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Event</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Tx Hash</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map(tx => (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`row-tx-${tx.id}`}>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded border text-xs ${EVENT_TYPE_STYLES[tx.eventType] ?? "text-muted-foreground"}`}>
                        {tx.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{tx.txHash.slice(0, 10)}…{tx.txHash.slice(-4)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(tx.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Dividend participation */}
      <section>
        <h2 className="font-mono font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Dividend Participation</h2>
        <p className="text-xs font-mono text-muted-foreground mb-3">Payout amounts are encrypted — only you can decrypt them via your wallet key.</p>
        <div className="border border-border rounded-lg overflow-hidden">
          {divLoading ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : dividendRecords?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">No dividend rounds participated in yet</div>
          ) : (
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Round</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Your Payout</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {dividendRecords?.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20" data-testid={`row-dividend-${r.id}`}>
                    <td className="px-4 py-2.5 text-primary font-bold">#{r.roundNumber}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Lock className="w-3 h-3" />
                        Encrypted
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(r.distributedAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border ${r.status === "eligible" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" : "text-muted-foreground border-border"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg flex flex-col gap-2">
      <div className="text-muted-foreground w-4 h-4">{icon}</div>
      <div className="font-mono font-bold text-lg">{value}</div>
      <div className="font-mono text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
