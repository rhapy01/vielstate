import { Link } from "wouter";
import { Building, MapPin, Users } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PurchaseSharesPanel } from "@/components/purchase-shares-panel";
import { Badge } from "@/components/ui/badge";
import { usePropertyShareSupply, type PropertyListing } from "@/hooks/use-marketplace";

type PropertyListingCardProps = {
  property: PropertyListing;
  investorCount?: number;
  showQuickBuy?: boolean;
};

export function PropertyListingCard({ property, investorCount, showQuickBuy = true }: PropertyListingCardProps) {
  const tokenPrice = `${property.pricePerShare} tUSDC`;
  const { data: supply } = usePropertyShareSupply(property.id);

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group">
      <Link href={`/listings/${property.id}`}>
        <div className="relative aspect-[16/10] overflow-hidden cursor-pointer">
          <img
            src={property.imageUrl}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <Badge className="font-mono text-[10px] bg-primary/90">{property.status.toUpperCase()}</Badge>
          </div>
        </div>
      </Link>

      <div className="p-4 space-y-3">
        <Link href={`/listings/${property.id}`}>
          <div className="cursor-pointer">
            <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
              {property.name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {property.location}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-[10px] font-mono text-muted-foreground">Value</div>
            <div className="text-xs font-bold font-mono">{formatCurrency(property.valueUsd)}</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-[10px] font-mono text-muted-foreground">Total shares</div>
            <div className="text-xs font-bold font-mono">{formatNumber(property.totalShares)}</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-[10px] font-mono text-muted-foreground">Available</div>
            <div className="text-xs font-bold font-mono text-primary">
              {supply?.hasUntrackedPurchases && supply.sharesSold === 0
                ? `≤ ${formatNumber(property.totalShares)}`
                : formatNumber(supply?.sharesRemaining ?? property.totalShares)}
            </div>
            {supply?.hasUntrackedPurchases && supply.sharesSold === 0 && (
              <div className="text-[9px] font-mono text-muted-foreground mt-0.5">older buys not tracked</div>
            )}
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-[10px] font-mono text-muted-foreground">Price</div>
            <div className="text-xs font-bold font-mono text-primary">{tokenPrice}</div>
          </div>
        </div>

        {investorCount !== undefined && (
          <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {investorCount} investor{investorCount === 1 ? "" : "s"}
          </p>
        )}

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{property.description}</p>

        {showQuickBuy && <PurchaseSharesPanel property={property} compact className="border-0 bg-muted/30 p-3" />}

        <Link href={`/listings/${property.id}`}>
          <span className="text-xs font-mono text-primary hover:underline cursor-pointer flex items-center gap-1">
            <Building className="w-3 h-3" />
            View listing details
          </span>
        </Link>
      </div>
    </article>
  );
}
