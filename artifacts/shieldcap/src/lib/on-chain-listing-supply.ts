import { apiUrl } from "@/lib/api";

export type OnChainListingSupply = {
  sharesListed: number;
  sharesRemaining: number;
  active: boolean;
};

export async function fetchOnChainListingSupplies(
  listingIds: number[],
): Promise<Record<number, OnChainListingSupply>> {
  if (!listingIds.length) return {};
  const res = await fetch(apiUrl(`/api/listings/on-chain/supply?ids=${listingIds.join(",")}`));
  if (!res.ok) return {};
  const data = (await res.json()) as {
    supplies: Record<string, OnChainListingSupply>;
  };
  const out: Record<number, OnChainListingSupply> = {};
  for (const [id, supply] of Object.entries(data.supplies ?? {})) {
    out[Number(id)] = supply;
  }
  return out;
}

export async function syncOnChainListingCreated(payload: {
  onChainListingId: number;
  propertyId: number;
  sellerWallet: string;
  sharesListed: number;
  pricePerShare: number;
  createTxHash: string;
}) {
  await fetch(apiUrl("/api/listings/on-chain"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function syncOnChainListingFill(payload: {
  onChainListingId: number;
  shareCount: number;
  buyerWallet: string;
  txHash: string;
}) {
  await fetch(apiUrl(`/api/listings/on-chain/${payload.onChainListingId}/fill`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function syncOnChainListingCancel(payload: {
  onChainListingId: number;
  sellerWallet: string;
}) {
  await fetch(apiUrl(`/api/listings/on-chain/${payload.onChainListingId}/cancel`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
