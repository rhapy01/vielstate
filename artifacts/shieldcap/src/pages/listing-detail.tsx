import { useRoute, Link } from "wouter";
import {
  useListTransactions, getListTransactionsQueryKey,
  useListDividendRounds, getListDividendRoundsQueryKey,
} from "@workspace/api-client-react";
import { usePropertyById, useOnChainPropertyStats, usePropertyShareSupply } from "@/hooks/use-marketplace";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import { PurchaseSharesPanel } from "@/components/purchase-shares-panel";
import { Shield, Activity, TrendingUp, Users, ArrowUpDown, CheckCircle2, XCircle, Banknote, RefreshCw, ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const EVENT_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  Purchase: { label: "Purchase", color: "text-primary border-primary/30 bg-primary/10" },
  Transfer: { label: "Transfer", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  DividendDistribution: { label: "Dividend", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  CapRejected: { label: "Cap Rejected", color: "text-destructive border-destructive/30 bg-destructive/10" },
};

export default function ListingDetail() {
  const [, params] = useRoute("/listings/:id");
  const propertyId = params?.id ? Number(params.id) : undefined;

  const { data: property, isLoading: propLoading } = usePropertyById(propertyId);
  const { data: onChainStats, isLoading: statsLoading } = useOnChainPropertyStats(propertyId);
  const { data: supply } = usePropertyShareSupply(propertyId);
  const { data: transactions, isLoading: txLoading } = useListTransactions({ query: { queryKey: getListTransactionsQueryKey() } });
  const { data: dividendRounds, isLoading: divLoading } = useListDividendRounds({ query: { queryKey: getListDividendRoundsQueryKey() } });

  if (propLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-6xl mx-auto text-center py-16">
        <p className="text-muted-foreground font-mono">Listing not found.</p>
        <Link href="/explore">
          <span className="text-primary text-sm font-mono hover:underline cursor-pointer mt-4 inline-block">← Back to Explore</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Link href="/explore">
        <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary cursor-pointer">
          <ChevronLeft className="w-3 h-3" />
          Back to Explore
        </span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={property.imageUrl} alt={property.name} className="w-full aspect-video object-cover" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="font-mono text-xs">{property.status.toUpperCase()}</Badge>
              <span className="text-xs font-mono text-muted-foreground">{property.location}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{property.name}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat label="Listed value" value={formatCurrency(property.valueUsd)} />
            <Stat label="Total shares" value={formatNumber(property.totalShares)} />
            <Stat
              label="Available"
              value={
                supply?.hasUntrackedPurchases && supply.sharesSold === 0
                  ? `≤ ${formatNumber(property.totalShares)}`
                  : formatNumber(supply?.sharesRemaining ?? property.totalShares)
              }
              hint={
                supply?.hasUntrackedPurchases && supply.sharesSold === 0
                  ? "older purchases not tracked yet"
                  : undefined
              }
            />
            <Stat label="Price / share" value={`${property.pricePerShare} tUSDC`} />
            <Stat label="Investors" value={statsLoading ? "…" : String(onChainStats?.investorCount ?? 0)} />
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs font-mono text-muted-foreground">
              Individual ownership amounts stay encrypted on-chain via Zama FHE. Only your wallet can decrypt your balance.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <PurchaseSharesPanel property={property} />
          <Link href="/market">
            <span className="block text-center text-xs font-mono text-muted-foreground hover:text-primary cursor-pointer">
              Already own shares? Trade on Secondary Market →
            </span>
          </Link>
        </div>
      </div>

      {onChainStats && (
        <section>
          <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            On-Chain Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<Users />} label="Investors" value={String(onChainStats.investorCount)} />
            <MetricCard icon={<ArrowUpDown />} label="Total shares" value={formatNumber(onChainStats.totalShares)} />
            <MetricCard
              icon={<TrendingUp />}
              label="Available"
              value={
                supply?.hasUntrackedPurchases && supply.sharesSold === 0
                  ? `≤ ${formatNumber(onChainStats.totalShares)}`
                  : formatNumber(supply?.sharesRemaining ?? onChainStats.totalShares)
              }
            />
            <MetricCard icon={<Users />} label="Max per wallet" value={formatNumber(onChainStats.maxShares)} />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          On-Chain Activity Feed
        </h2>
        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Event</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Tx Hash</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
              ) : !transactions?.length ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-xs">No activity yet</td></tr>
              ) : transactions.slice(0, 10).map(tx => {
                const style = EVENT_TYPE_STYLES[tx.eventType] ?? { label: tx.eventType, color: "" };
                return (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-xs ${style.color}`}>{style.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{tx.txHash.slice(0, 10)}…{tx.txHash.slice(-6)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(tx.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {dividendRounds && dividendRounds.length > 0 && (
        <section>
          <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            Dividend History
          </h2>
          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Round</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Distributed</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {divLoading ? (
                  [...Array(2)].map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                  ))
                ) : dividendRounds.map(round => (
                  <tr key={round.id} className="border-b border-border">
                    <td className="px-4 py-3 text-primary font-bold">#{round.roundNumber}</td>
                    <td className="px-4 py-3 text-emerald-400">{formatCurrency(round.totalDistributedUsd)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(round.distributedAt)}</td>
                    <td className="px-4 py-3">
                      {round.status === "confirmed"
                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="w-3 h-3" />Confirmed</span>
                        : round.status === "failed"
                        ? <span className="flex items-center gap-1 text-destructive text-xs"><XCircle className="w-3 h-3" />Failed</span>
                        : <span className="text-muted-foreground text-xs">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-3 bg-card border border-border rounded-lg">
      <div className="text-[10px] text-muted-foreground font-mono mb-1">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
      {hint && <div className="text-[9px] font-mono text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-1">
      <div className="text-muted-foreground w-4 h-4">{icon}</div>
      <div className="font-mono text-lg font-bold">{value}</div>
      <div className="font-mono text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
