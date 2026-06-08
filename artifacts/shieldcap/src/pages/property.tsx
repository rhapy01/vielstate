import {
  useGetProperty, getGetPropertyQueryKey,
  useGetPropertyMetrics, getGetPropertyMetricsQueryKey,
  useListTransactions, getListTransactionsQueryKey,
  useListDividendRounds, getListDividendRoundsQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import { Shield, Activity, TrendingUp, Users, ArrowUpDown, CheckCircle2, XCircle, Banknote, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const EVENT_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  Purchase: { label: "Purchase", color: "text-primary border-primary/30 bg-primary/10" },
  Transfer: { label: "Transfer", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  DividendDistribution: { label: "Dividend", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  CapRejected: { label: "Cap Rejected", color: "text-destructive border-destructive/30 bg-destructive/10" },
};

export default function Property() {
  const { data: property, isLoading: propLoading } = useGetProperty({ query: { queryKey: getGetPropertyQueryKey() } });
  const { data: metrics, isLoading: metricsLoading } = useGetPropertyMetrics({ query: { queryKey: getGetPropertyMetricsQueryKey() } });
  const { data: transactions, isLoading: txLoading } = useListTransactions({ query: { queryKey: getListTransactionsQueryKey() } });
  const { data: dividendRounds, isLoading: divLoading } = useListDividendRounds({ query: { queryKey: getListDividendRoundsQueryKey() } });

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-sans tracking-tight">Property Details</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Kampala Heights Apartments. Public information only.</p>
      </div>

      {/* Property overview */}
      {propLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : property && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 aspect-video bg-muted rounded-lg overflow-hidden">
            <img src={property.imageUrl} alt={property.name} className="object-cover w-full h-full" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div>
              <h2 className="font-bold text-2xl font-mono">{property.name}</h2>
              <p className="text-muted-foreground text-sm">{property.location}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Asset Value" value={formatCurrency(property.valueUsd)} />
              <Stat label="Total Shares" value={formatNumber(property.totalShares)} />
              <Stat label="Price / Share" value={formatCurrency(property.pricePerShare)} />
            </div>
          </div>
        </div>
      )}

      {/* Public metrics */}
      <section>
        <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Public Protocol Metrics
        </h2>
        {metricsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<TrendingUp />} label="Revenue Distributed" value={formatCurrency(metrics.totalRevenueDistributedUsd)} />
            <MetricCard icon={<Users />} label="Investors" value={metrics.investorCount.toString()} />
            <MetricCard icon={<ArrowUpDown />} label="Transactions" value={metrics.totalTransactions.toString()} />
            <MetricCard icon={<Banknote />} label="Dividend Rounds" value={metrics.totalDividendRounds.toString()} />
          </div>
        )}
      </section>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-md">
        <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs font-mono text-muted-foreground">
          <span className="text-primary font-bold">Investor data is not visible here.</span>{" "}
          Balances, ownership percentages, and transfer amounts are encrypted via Zama fhEVM and can only be decrypted by the owning wallet.
        </p>
      </div>

      {/* Transaction feed */}
      <section>
        <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          Live Transaction Feed
        </h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Event</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Tx Hash</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Block</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={4} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : transactions?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">No transactions yet</td>
                </tr>
              ) : transactions?.map(tx => {
                const style = EVENT_TYPE_STYLES[tx.eventType] ?? { label: tx.eventType, color: "text-muted-foreground" };
                return (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`row-transaction-${tx.id}`}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-xs font-mono ${style.color}`}>{style.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{tx.txHash.slice(0, 10)}…{tx.txHash.slice(-6)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{tx.blockNumber.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(tx.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dividend history */}
      <section>
        <h2 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary" />
          Dividend Distribution History
        </h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Round</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Revenue</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Total Distributed</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Date</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {divLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : dividendRounds?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No dividend rounds yet</td>
                </tr>
              ) : dividendRounds?.map(round => (
                <tr key={round.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`row-dividend-${round.id}`}>
                  <td className="px-4 py-3 text-primary font-bold">#{round.roundNumber}</td>
                  <td className="px-4 py-3">{formatCurrency(round.revenueUsd)}</td>
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-card border border-border rounded-md">
      <div className="text-xs text-muted-foreground font-mono mb-1">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-5 bg-card border border-border rounded-lg flex flex-col gap-2">
      <div className="text-muted-foreground w-4 h-4">{icon}</div>
      <div className="font-mono text-xl font-bold">{value}</div>
      <div className="font-mono text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
