import { useGetProperty, getGetPropertyQueryKey, useGetPropertyMetrics, getGetPropertyMetricsQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Shield, Activity, TrendingUp, Users, Box } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: property, isLoading: isPropLoading } = useGetProperty({ query: { queryKey: getGetPropertyQueryKey() } });
  const { data: metrics, isLoading: isMetricsLoading } = useGetPropertyMetrics({ query: { queryKey: getGetPropertyMetricsQueryKey() } });

  if (isPropLoading || isMetricsLoading) {
    return <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>;
  }

  if (!property || !metrics) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight">{property.name}</h1>
          <p className="text-muted-foreground font-mono mt-2">{property.location}</p>
        </div>
        <Link href="/property">
          <Button className="font-mono">View Deep Metrics</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-video bg-muted border border-border rounded-lg overflow-hidden relative group">
          <img src={property.imageUrl} alt={property.name} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 font-mono text-sm">
            <span className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded backdrop-blur">Status: {property.status.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="font-mono text-sm text-muted-foreground mb-1">Asset Value</h3>
            <div className="text-4xl font-bold font-mono text-primary">{formatCurrency(property.valueUsd)}</div>
          </div>
          
          <p className="text-sm leading-relaxed text-muted-foreground">
            {property.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-md">
              <span className="font-mono text-xs text-muted-foreground block mb-2">Total Shares</span>
              <span className="font-mono text-xl font-bold">{formatNumber(property.totalShares)}</span>
            </div>
            <div className="p-4 bg-card border border-border rounded-md">
              <span className="font-mono text-xs text-muted-foreground block mb-2">Price Per Share</span>
              <span className="font-mono text-xl font-bold">{formatCurrency(property.pricePerShare)}</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold font-sans tracking-tight pt-8 border-t border-border">Public Protocol Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Users />} label="Registered Investors" value={metrics.investorCount.toString()} />
        <MetricCard icon={<Box />} label="Share Cap" value={formatNumber(metrics.totalSharesIssued)} />
        <MetricCard icon={<TrendingUp />} label="Revenue Distributed" value={formatCurrency(metrics.totalRevenueDistributedUsd)} />
        <MetricCard icon={<Activity />} label="On-chain Transactions" value={metrics.totalTransactions.toString()} />
      </div>
      
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-md flex items-start gap-3 mt-8">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-primary/90 font-mono">
          <strong className="block text-primary mb-1">Confidential investing (differentiator)</strong>
          Vielstate is a fractional real estate platform first. Zama fhEVM keeps individual balances, transfers, and returns private on-chain — the metrics above are public aggregates only.
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-5 bg-card border border-border rounded-lg flex flex-col gap-3">
      <div className="text-muted-foreground w-5 h-5">{icon}</div>
      <div>
        <div className="font-mono text-2xl font-bold">{value}</div>
        <div className="font-mono text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
