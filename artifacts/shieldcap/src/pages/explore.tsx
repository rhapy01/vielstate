import { useState, useMemo } from "react";
import { useListProperties } from "@/hooks/use-marketplace";
import { PropertyListingCard } from "@/components/property-listing-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2 } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
export default function Explore() {
  const { address, connect, isConnecting } = useWallet();
  const { data: properties, isLoading, isError } = useListProperties();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!properties) return [];
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [properties, search]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Explore Listings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse tokenized properties on Sepolia. Buy shares directly from the feed or open a listing for details.
          </p>
        </div>
        {!address && (
          <Button onClick={() => void connect()} disabled={isConnecting} className="font-mono text-xs shrink-0">
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search by name, city, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-mono text-sm h-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      ) : isError || (!isLoading && !properties?.length) ? (
        <div className="text-center py-16 space-y-3">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-mono text-sm">
            No on-chain property listings yet. Redeploy the contract and call createProperty.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-mono text-sm">
            {search ? "No listings match your search." : "No active property listings yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((property) => (
            <PropertyListingCard key={property.id} property={property} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-4 border-t border-border text-sm">
        <Link href="/portfolio">
          <span className="text-primary font-mono text-xs hover:underline cursor-pointer">My Portfolio →</span>
        </Link>
        <Link href="/market">
          <span className="text-primary font-mono text-xs hover:underline cursor-pointer">Secondary Market →</span>
        </Link>
      </div>

    </div>
  );
}
