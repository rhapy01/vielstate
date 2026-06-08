import { useQuery } from "@tanstack/react-query";
import { useShieldCapContract, type OnChainProperty, type OnChainSecondaryListing } from "@/hooks/use-shieldcap";
import { apiUrl } from "@/lib/api";
import { fetchOnChainListingSupplies } from "@/lib/on-chain-listing-supply";

export type PropertyShareSupply = {
  propertyId: number;
  totalShares: number;
  sharesSold: number;
  sharesRemaining: number;
  hasUntrackedPurchases: boolean;
};

export type PropertyListing = OnChainProperty & {
  imageUrl: string;
};

export function useListProperties() {
  const { readActiveProperties, isConfigured } = useShieldCapContract();
  return useQuery({
    queryKey: ["on-chain-properties"],
    queryFn: readActiveProperties,
    enabled: isConfigured,
    refetchInterval: 30_000,
  });
}

export function usePropertyById(id: number | undefined) {
  const { readProperty, isConfigured } = useShieldCapContract();
  return useQuery({
    queryKey: ["on-chain-properties", id],
    enabled: isConfigured && !!id,
    queryFn: () => readProperty(id!),
    refetchInterval: 30_000,
  });
}

export function useShareListings() {
  const { readActiveSecondaryListings, isConfigured } = useShieldCapContract();
  return useQuery({
    queryKey: ["on-chain-secondary-listings"],
    queryFn: readActiveSecondaryListings,
    enabled: isConfigured,
    refetchInterval: 15_000,
  });
}

export function useOnChainListingSupplies(listingIds: number[]) {
  const key = [...listingIds].sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: ["on-chain-listing-supply", key],
    queryFn: () => fetchOnChainListingSupplies(listingIds),
    enabled: listingIds.length > 0,
    refetchInterval: 15_000,
  });
}

export function useOnChainPropertyStats(propertyId: number | undefined) {
  const { readOnChainTotals, isConfigured } = useShieldCapContract();
  return useQuery({
    queryKey: ["on-chain-stats", propertyId],
    enabled: isConfigured && !!propertyId,
    queryFn: () => readOnChainTotals(propertyId!),
    refetchInterval: 30_000,
  });
}

export function usePropertyShareSupply(propertyId: number | undefined) {
  return useQuery({
    queryKey: ["property-share-supply", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<PropertyShareSupply> => {
      const res = await fetch(apiUrl(`/api/property/${propertyId}/supply`));
      if (!res.ok) throw new Error("Failed to load share supply");
      return res.json() as Promise<PropertyShareSupply>;
    },
    refetchInterval: 30_000,
  });
}
