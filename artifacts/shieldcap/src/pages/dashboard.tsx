import { useGetProperty, getGetPropertyQueryKey, useGetPropertyMetrics, getGetPropertyMetricsQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Shield, Activity, TrendingUp, Users, Box, Building, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/contexts/wallet-context";

export default function Dashboard() {
  const { address, connect } = useWallet();
  const { data: property, isLoading: isPropLoading } = useGetProperty({ query: { queryKey: getGetPropertyQueryKey() } });
  const { data: metrics, isLoading: isMetricsLoading } = useGetPropertyMetrics({ query: { queryKey: getGetPropertyMetricsQueryKey() } });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">ShieldCap protocol overview — public aggregate data</p>
        </div>
        <Link href="/property">
          <Button variant="outline" size="sm" className="font-mono gap-1.5 text-xs">
            Deep Metrics
            <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Property card */}
      {isPropLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : property && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-2 relative">
              <img
                src={property.imageUrl}
                alt={property.name}
                className="w-full h-48 md:h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80 hidden md:block" />
              <div className="absolute bottom-3 left-3">
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-mono rounded">
                  {property.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="md:col-span-3 p-6 flex flex-col justify-center space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mb-1">
                  <Building className="w-3 h-3" />
                  {property.location}
                </div>
                <h2 className="text-xl font-bold">{property.name}</h2>
              </div>
              <div className="text-3xl font-bold font-mono text-primary">{formatCurrency(property.valueUsd)}</div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{property.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs font-mono text-muted-foreground mb-0.5">Total Shares</div>
                  <div className="font-bold font-mono">{formatNumber(property.totalShares)}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs font-mono text-muted-foreground mb-0.5">Price / Share</div>
                  <div className="font-bold font-mono">{formatCurrency(property.pricePerShare)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-4">Public Protocol Metrics</h2>
        {isMetricsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={<Users className="w-4 h-4" />} label="Investors" value={metrics.investorCount.toString()} />
            <MetricCard icon={<Box className="w-4 h-4" />} label="Shares Issued" value={formatNumber(metrics.totalSharesIssued)} />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Revenue Distributed" value={formatCurrency(metrics.totalRevenueDistributedUsd)} />
            <MetricCard icon={<Activity className="w-4 h-4" />} label="Transactions" value={metrics.totalTransactions.toString()} />
          </div>
        )}
      </div>

      {/* Wallet CTA */}
      {!address && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">Access your private portfolio</h3>
            <p className="text-sm text-muted-foreground">Connect your wallet to decrypt your encrypted share balance, view your dividend history, and initiate confidential transfers.</p>
          </div>
          <Button onClick={connect} className="font-mono text-sm shrink-0" data-testid="button-connect-dashboard">
            Connect Wallet
          </Button>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/portfolio", icon: <Shield className="w-4 h-4" />, label: "My Portfolio", desc: "View encrypted balance & dividends" },
          { href: "/market", icon: <Activity className="w-4 h-4" />, label: "Market", desc: "Confidential P2P share transfers" },
          { href: "/demo", icon: <TrendingUp className="w-4 h-4" />, label: "Interactive Demo", desc: "Walk through the FHE protocol" },
        ].map(item => (
          <Link key={item.href} href={item.href}>
            <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-center gap-2 text-primary mb-2">
                {item.icon}
                <span className="font-semibold text-sm">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Privacy notice */}
      <div className="p-4 bg-muted/50 border border-border rounded-lg flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs font-mono text-muted-foreground">
          <span className="text-foreground font-bold">Privacy Guarantee: </span>
          Individual balances, transfers, and wallet associations are encrypted via Zama fhEVM. The metrics above are provably computed over encrypted state — no decryption occurs.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-5 bg-card border border-border rounded-xl flex flex-col gap-3 hover:border-primary/20 transition-colors">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="font-bold text-xl font-mono">{value}</div>
        <div className="text-xs font-mono text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}
