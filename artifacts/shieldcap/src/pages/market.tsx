import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "ethers";
import { useWallet, useIsCorrectNetwork } from "@/contexts/wallet-context";
import { useFhevm } from "@/contexts/fhevm-context";
import { useShieldCapContract, formatTxError } from "@/hooks/use-shieldcap";
import { useListProperties, useOnChainListingSupplies } from "@/hooks/use-marketplace";
import {
  readCachedListingSupply,
  syncOnChainListingCreated,
} from "@/lib/on-chain-listing-supply";
import { useRegisterInvestor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertTriangle, Wallet, ExternalLink, Tag, ShoppingBag } from "lucide-react";
import { sepoliaTxUrl } from "@/lib/explorer";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Market() {
  const { address, connect, isConnecting, isSwitchingChain, error: walletError, signer } = useWallet();
  const isCorrectNetwork = useIsCorrectNetwork();
  const { instance, isInitializing } = useFhevm();
  const {
    isConfigured,
    paymentTokenSymbol,
    paymentTokenDecimals,
    createSecondaryListing,
    buySecondaryListing,
    cancelSecondaryListing,
    readActiveSecondaryListings,
    readPropertiesWithBalance,
  } = useShieldCapContract();
  const registerInvestor = useRegisterInvestor();
  const queryClient = useQueryClient();
  const { data: properties } = useListProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [listShareCount, setListShareCount] = useState("10");
  const [listPricePerShare, setListPricePerShare] = useState("1");
  const [buyAmounts, setBuyAmounts] = useState<Record<number, string>>({});
  const [listError, setListError] = useState("");
  const [isListing, setIsListing] = useState(false);
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [syncingSupplyId, setSyncingSupplyId] = useState<number | null>(null);
  const [registerShares, setRegisterShares] = useState<Record<number, string>>({});
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const tokenLabel = paymentTokenSymbol ?? "ctUSDC";

  const { data: listings, isLoading, refetch } = useQuery({
    queryKey: ["on-chain-secondary-listings"],
    queryFn: readActiveSecondaryListings,
    enabled: isConfigured,
    refetchInterval: 15_000,
  });

  const listingIds = listings?.map((l) => l.id) ?? [];
  const { data: listingSupplies, refetch: refetchSupplies } = useOnChainListingSupplies(listingIds);

  const { data: ownedBalances } = useQuery({
    queryKey: ["owned-share-balances", address],
    queryFn: () => readPropertiesWithBalance(address!, signer!),
    enabled: isConfigured && !!address && !!signer,
    refetchInterval: 15_000,
  });

  const propertyNameById = (id: number) => properties?.find((p) => p.id === id)?.name ?? `Property #${id}`;
  const myListings = listings?.filter((l) => address && l.seller === address.toLowerCase()) ?? [];

  const myListingIds = listings
    ?.filter((l) => address && l.seller === address.toLowerCase())
    .map((l) => l.id)
    .join(",") ?? "";

  useEffect(() => {
    if (!myListingIds || !address) return;
    let cancelled = false;
    (async () => {
      for (const listingId of myListingIds.split(",").map(Number)) {
        if (listingSupplies?.[listingId]) continue;
        const cached = readCachedListingSupply(listingId);
        if (!cached) continue;
        try {
          await syncOnChainListingCreated({
            onChainListingId: listingId,
            propertyId: cached.propertyId,
            sellerWallet: address,
            sharesListed: cached.sharesListed,
            pricePerShare: cached.pricePerShare,
            createTxHash: cached.createTxHash ?? "",
          });
          if (!cancelled) {
            void refetchSupplies();
          }
        } catch {
          // manual register still available
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myListingIds, listingSupplies, address, refetchSupplies]);

  const handleRegisterSupply = async (listing: { id: number; propertyId: number; pricePerShare: number }) => {
    if (!address) return;
    const cached = readCachedListingSupply(listing.id);
    const sharesListed = parseInt(registerShares[listing.id] ?? String(cached?.sharesListed ?? ""), 10);
    if (isNaN(sharesListed) || sharesListed <= 0) {
      setActionError((prev) => ({
        ...prev,
        [listing.id]: "Enter how many shares you listed",
      }));
      return;
    }

    setSyncingSupplyId(listing.id);
    setActionError((prev) => ({ ...prev, [listing.id]: "" }));
    try {
      await syncOnChainListingCreated({
        onChainListingId: listing.id,
        propertyId: listing.propertyId,
        sellerWallet: address,
        sharesListed,
        pricePerShare: listing.pricePerShare,
        createTxHash: cached?.createTxHash ?? "",
      });
      void refetchSupplies();
      void queryClient.invalidateQueries({ queryKey: ["on-chain-listing-supply"] });
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [listing.id]: err instanceof Error ? err.message : "Could not register listing supply",
      }));
    } finally {
      setSyncingSupplyId(null);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setListError("");
    setLastTxHash(null);
    if (!address) return;

    const propertyId = parseInt(selectedPropertyId, 10);
    const shareCount = parseInt(listShareCount, 10);
    const pricePerShare = parseFloat(listPricePerShare);
    if (isNaN(propertyId) || propertyId <= 0) {
      setListError("Select a property");
      return;
    }
    if (isNaN(shareCount) || shareCount <= 0) {
      setListError("Enter how many shares to list");
      return;
    }
    if (isNaN(pricePerShare) || pricePerShare <= 0) {
      setListError("Enter a valid price per share");
      return;
    }

    setIsListing(true);
    try {
      await registerInvestor.mutateAsync({ data: { walletAddress: address } });
      const priceUnits = parseUnits(pricePerShare.toFixed(paymentTokenDecimals), paymentTokenDecimals);
      const receipt = await createSecondaryListing(propertyId, shareCount, priceUnits);
      setLastTxHash(receipt.hash);
      setSelectedPropertyId("");
      await refetch();
      void refetchSupplies();
      void queryClient.invalidateQueries({ queryKey: ["on-chain-secondary-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["on-chain-listing-supply"] });
      void queryClient.invalidateQueries({ queryKey: ["owned-share-balances", address] });
    } catch (err) {
      setListError(formatTxError(err));
    } finally {
      setIsListing(false);
    }
  };

  const handleBuy = async (listingId: number) => {
    if (!address) return;
    const amountStr = buyAmounts[listingId];
    const shareCount = parseInt(amountStr ?? "", 10);
    if (isNaN(shareCount) || shareCount <= 0) {
      setActionError((prev) => ({ ...prev, [listingId]: "Enter how many shares to buy" }));
      return;
    }

    const supply = listingSupplies?.[listingId];
    if (supply && shareCount > supply.sharesRemaining) {
      setActionError((prev) => ({
        ...prev,
        [listingId]:
          supply.sharesRemaining === 0
            ? "This listing is sold out"
            : `Only ${supply.sharesRemaining} share${supply.sharesRemaining === 1 ? "" : "s"} left`,
      }));
      return;
    }

    setActionError((prev) => ({ ...prev, [listingId]: "" }));
    setLastTxHash(null);
    setBuyingId(listingId);
    try {
      await registerInvestor.mutateAsync({ data: { walletAddress: address } });
      const receipt = await buySecondaryListing(listingId, shareCount);
      setLastTxHash(receipt.hash);
      await refetch();
      void refetchSupplies();
      void queryClient.invalidateQueries({ queryKey: ["on-chain-listing-supply"] });
      void queryClient.invalidateQueries({ queryKey: ["owned-share-balances", address] });
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [listingId]: formatTxError(err),
      }));
    } finally {
      setBuyingId(null);
    }
  };

  const handleCancel = async (listingId: number) => {
    if (!address) return;
    setCancellingId(listingId);
    setLastTxHash(null);
    try {
      const receipt = await cancelSecondaryListing(listingId);
      setLastTxHash(receipt.hash);
      await refetch();
      void refetchSupplies();
      void queryClient.invalidateQueries({ queryKey: ["on-chain-listing-supply"] });
      void queryClient.invalidateQueries({ queryKey: ["owned-share-balances", address] });
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [listingId]: formatTxError(err),
      }));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Secondary Market</h1>
        <p className="text-muted-foreground text-sm mt-1">
          List shares at your price. Buyers purchase any amount at that price — first come, first served.
        </p>
        <Link href="/explore">
          <span className="text-xs font-mono text-primary hover:underline cursor-pointer mt-2 inline-block">
            ← Primary listings on Explore
          </span>
        </Link>
      </div>

      {lastTxHash && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs font-mono flex items-center gap-2">
          Transaction submitted.
          <a href={sepoliaTxUrl(lastTxHash)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            Etherscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 bg-card border border-border rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <h2 className="font-mono font-bold text-sm">List shares for sale</h2>
            </div>

            {!address ? (
              <div className="space-y-3">
                <p className="text-xs font-mono text-muted-foreground">Connect to list shares from your balance.</p>
                <Button onClick={() => void connect()} disabled={isConnecting} className="w-full font-mono text-xs">
                  <Wallet className="w-3.5 h-3.5 mr-1.5" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateListing} className="space-y-3">
                {!isCorrectNetwork && (
                  <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-primary" />
                    {isSwitchingChain ? "Switching to Sepolia..." : "Confirm Sepolia in wallet"}
                  </p>
                )}
                <div className="space-y-1">
                  <Label className="font-mono text-xs text-muted-foreground">Property</Label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger className="font-mono text-xs h-9">
                      <SelectValue placeholder={ownedBalances?.length ? "Select property" : "Buy shares first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(ownedBalances ?? []).map((bal) => (
                        <SelectItem key={bal.propertyId} value={String(bal.propertyId)} className="font-mono text-xs">
                          {propertyNameById(bal.propertyId)} · {String(bal.shares)} shares
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-xs text-muted-foreground">Shares to list</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={listShareCount}
                    onChange={(e) => setListShareCount(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-xs text-muted-foreground">Price per share ({tokenLabel})</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={listPricePerShare}
                    onChange={(e) => setListPricePerShare(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                {listError && <p className="text-xs font-mono text-destructive">{listError}</p>}
                <Button
                  type="submit"
                  disabled={isListing || !isConfigured || !isCorrectNetwork || !instance || !ownedBalances?.length}
                  className="w-full font-mono text-xs"
                >
                  {isListing ? "Listing..." : "Create listing"}
                </Button>
              </form>
            )}

          </div>

          {address && myListings.length > 0 && (
            <div className="p-5 bg-card border border-border rounded-xl space-y-3">
              <h2 className="font-mono font-bold text-sm">Your listings</h2>
              {myListings.map((listing) => {
                const cachedSupply = readCachedListingSupply(listing.id);
                return (
                <div key={listing.id} className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs font-mono">
                  <div>
                    #{listing.id} · {propertyNameById(listing.propertyId)}
                  </div>
                  <div className="text-muted-foreground">
                    {listing.pricePerShare} {tokenLabel}/share
                  </div>
                  {listingSupplies?.[listing.id] ? (
                    <div className="text-muted-foreground">
                      {listingSupplies[listing.id].sharesRemaining} / {listingSupplies[listing.id].sharesListed} shares left
                    </div>
                  ) : null}
                  {!listingSupplies?.[listing.id] && (
                    <div className="space-y-2">
                      <Label className="font-mono text-[10px] text-muted-foreground">
                        Shares you listed
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder={
                          cachedSupply?.sharesListed
                            ? String(cachedSupply.sharesListed)
                            : "e.g. 10"
                        }
                        value={registerShares[listing.id] ?? ""}
                        onChange={(e) =>
                          setRegisterShares((prev) => ({ ...prev, [listing.id]: e.target.value }))
                        }
                        className="font-mono text-xs h-8"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-[10px] h-7"
                        disabled={syncingSupplyId === listing.id}
                        onClick={() => void handleRegisterSupply(listing)}
                      >
                        {syncingSupplyId === listing.id ? "Registering..." : "Register supply"}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-7"
                    disabled={cancellingId === listing.id}
                    onClick={() => void handleCancel(listing.id)}
                  >
                    {cancellingId === listing.id ? "Cancelling..." : "Cancel listing"}
                  </Button>
                  {actionError[listing.id] && (
                    <p className="text-[10px] font-mono text-destructive break-all [overflow-wrap:anywhere]">
                      {actionError[listing.id]}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono font-bold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              On-chain resale listings
            </h2>
            <Button variant="ghost" size="sm" onClick={() => void refetch()} className="text-xs font-mono gap-1">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>

          {!isConfigured ? (
            <div className="p-8 text-center border border-border rounded-xl text-xs font-mono text-muted-foreground">
              Deploy the updated ShieldCapProperty contract to enable on-chain listings.
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : !listings?.length ? (
            <div className="p-10 text-center border border-border rounded-xl">
              <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-mono">No active on-chain resale listings yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => {
                const isSeller = address?.toLowerCase() === listing.seller;
                const err = actionError[listing.id];
                const supply = listingSupplies?.[listing.id];
                const sharesLeft = supply?.sharesRemaining;
                const soldOut = supply != null && supply.sharesRemaining <= 0;
                const estCost = (parseFloat(buyAmounts[listing.id] ?? "0") || 0) * listing.pricePerShare;

                return (
                  <div key={listing.id} className="p-4 bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0 overflow-hidden">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm">
                        #{listing.id} · {propertyNameById(listing.propertyId)}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        Seller {truncateAddr(listing.seller)}
                      </div>
                      <div className="text-xs font-mono text-primary">
                        {listing.pricePerShare} {tokenLabel} / share
                      </div>
                      {supply ? (
                        <div className="text-xs font-mono text-foreground">
                          <span className="font-bold">{sharesLeft}</span>
                          <span className="text-muted-foreground"> / {supply.sharesListed} shares left</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full sm:w-auto sm:max-w-[min(100%,14rem)] min-w-0 space-y-2">
                      {!address ? (
                        <Button size="sm" onClick={() => void connect()} className="font-mono text-xs">
                          Connect to buy
                        </Button>
                      ) : isSeller ? (
                        <span className="text-xs font-mono text-muted-foreground block">Your listing</span>
                      ) : soldOut ? (
                        <span className="text-xs font-mono text-muted-foreground">Sold out</span>
                      ) : (
                        <>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Shares to buy"
                            value={buyAmounts[listing.id] ?? ""}
                            onChange={(e) =>
                              setBuyAmounts((prev) => ({ ...prev, [listing.id]: e.target.value }))
                            }
                            className="font-mono text-xs h-8 w-36"
                          />
                          {estCost > 0 && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              ≈ {estCost.toFixed(2)} {tokenLabel}
                            </p>
                          )}
                          <Button
                            size="sm"
                            disabled={buyingId === listing.id || !isCorrectNetwork || isInitializing || !instance}
                            onClick={() => void handleBuy(listing.id)}
                            className="font-mono text-xs w-36"
                          >
                            {buyingId === listing.id ? "Buying..." : "Buy shares"}
                          </Button>
                        </>
                      )}
                      {err && !isSeller && (
                        <p className="text-[10px] font-mono text-destructive break-all [overflow-wrap:anywhere]">
                          {err}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {walletError && !address && (
        <p className="text-xs font-mono text-destructive">{walletError}</p>
      )}
    </div>
  );
}
