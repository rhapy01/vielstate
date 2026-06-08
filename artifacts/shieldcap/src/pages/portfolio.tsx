import { useState, useEffect, useCallback } from "react";
import { useWallet, useIsCorrectNetwork } from "@/contexts/wallet-context";
import { useFhevm } from "@/contexts/fhevm-context";
import { useShieldCapContract } from "@/hooks/use-shieldcap";
import {
  useGetInvestorProfile, getGetInvestorProfileQueryKey,
  useGetInvestorTransactions, getGetInvestorTransactionsQueryKey,
  useGetInvestorDividends, getGetInvestorDividendsQueryKey,
  useRegisterInvestor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { EncryptedValue } from "@/components/encrypted-value";
import { formatDate } from "@/lib/format";
import { formatUnits } from "ethers";
import { Shield, Wallet, Lock, Unlock, TrendingUp, Activity, Banknote, AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { usePropertyById } from "@/hooks/use-marketplace";
import { sepoliaTxUrl } from "@/lib/explorer";

const DEFAULT_PROPERTY_ID = 1;

const EVENT_TYPE_STYLES: Record<string, string> = {
  Purchase: "text-primary border-primary/30 bg-primary/10",
  Transfer: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  DividendDistribution: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  CapRejected: "text-destructive border-destructive/30 bg-destructive/10",
};

export default function Portfolio() {
  const { address, connect, signer, isConnecting, isSwitchingChain, error: walletError } = useWallet();
  const isCorrectNetwork = useIsCorrectNetwork();
  const { instance, isInitializing } = useFhevm();
  const {
    isConfigured,
    readShareBalance,
    readOnChainTotals,
    readDividendPayout,
    readPricePerShare,
    claimDividend,
    paymentTokenSymbol,
    paymentTokenDecimals,
  } = useShieldCapContract();
  const queryClient = useQueryClient();
  const registerInvestor = useRegisterInvestor();

  const [shareBalance, setShareBalance] = useState<bigint | null>(null);
  const [totalShares, setTotalShares] = useState(50_000);
  const [pricePerShareEth, setPricePerShareEth] = useState("0.001");
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState("");
  const [dividendPayout, setDividendPayout] = useState<bigint | null>(null);
  const [isDividendDecrypted, setIsDividendDecrypted] = useState(false);
  const [isDecryptingDividend, setIsDecryptingDividend] = useState(false);
  const [dividendError, setDividendError] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);

  const { data: property } = usePropertyById(DEFAULT_PROPERTY_ID);
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

  useEffect(() => {
    if (property) {
      setTotalShares(property.totalShares);
    }
  }, [property]);

  const handleConnect = async () => {
    await connect();
  };

  useEffect(() => {
    if (!address) return;
    registerInvestor.mutate(
      { data: { walletAddress: address } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvestorProfileQueryKey(address) });
        },
      },
    );
  }, [address]);

  const handleDecrypt = useCallback(async () => {
    if (!address || !signer || !instance || !isConfigured) return;
    setIsDecrypting(true);
    setDecryptError("");
    setIsDecrypted(false);
    try {
      const [balance, priceEth, totals] = await Promise.all([
        readShareBalance(DEFAULT_PROPERTY_ID, address, signer),
        readPricePerShare(DEFAULT_PROPERTY_ID),
        readOnChainTotals(DEFAULT_PROPERTY_ID),
      ]);
      setShareBalance(balance);
      setPricePerShareEth(priceEth);
      setIsDecrypted(true);
      setTotalShares(totals.totalShares);
    } catch (err) {
      setDecryptError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  }, [address, signer, instance, isConfigured, readShareBalance, readOnChainTotals, readPricePerShare]);

  const handleDecryptDividend = useCallback(async () => {
    if (!address || !signer || !instance || !isConfigured) return;
    setIsDecryptingDividend(true);
    setDividendError("");
    setIsDividendDecrypted(false);
    try {
      const payout = await readDividendPayout(DEFAULT_PROPERTY_ID, address, signer);
      setDividendPayout(payout);
      setIsDividendDecrypted(true);
    } catch (err) {
      setDividendError(err instanceof Error ? err.message : "Dividend decryption failed");
    } finally {
      setIsDecryptingDividend(false);
    }
  }, [address, signer, instance, isConfigured, readDividendPayout]);

  const shares = shareBalance !== null ? Number(shareBalance) : 0;
  const ownershipPct = totalShares > 0 ? (shares / totalShares) * 100 : 0;
  const priceEthNum = parseFloat(pricePerShareEth) || 0;
  const portfolioValueEth = shares * priceEthNum;
  const isNearCap = ownershipPct > 15;
  const tokenLabel = paymentTokenSymbol ?? "ctUSDC";
  const formattedDividendPayout =
    dividendPayout !== null
      ? Number(formatUnits(dividendPayout, paymentTokenDecimals)).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })
      : "0";
  const hasClaimableDividend = isDividendDecrypted && dividendPayout !== null && dividendPayout > 0n;
  const isWaitingForNextPayout =
    isDividendDecrypted && !hasClaimableDividend && (claimTxHash !== null || dividendPayout === 0n);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono">Private Portfolio</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">Connect your wallet to view your portfolio.</p>
        </div>
        <Button onClick={handleConnect} disabled={isConnecting} className="w-full max-w-sm font-mono">
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">Private Portfolio</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1 truncate">{address}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded text-xs font-mono text-primary shrink-0 self-start">
          <Shield className="w-3 h-3" />
          Sepolia FHEVM
        </div>
      </div>

      {!isCorrectNetwork && (
        <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/25 rounded-md text-xs font-mono text-muted-foreground">
          <AlertTriangle className="w-4 h-4 shrink-0 text-primary" />
          {isSwitchingChain
            ? "Switching your wallet to Sepolia automatically..."
            : walletError ?? "Confirm the Sepolia network switch in your wallet popup."}
        </div>
      )}

      {!isConfigured && (
        <div className="text-xs font-mono text-yellow-500 p-3 border border-yellow-500/30 rounded-md bg-yellow-500/10">
          We could not reach the property contract. Confirm you are on Sepolia and try again.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <EncryptedValue
            value={isDecrypted ? `${shares.toLocaleString()} shares` : "N/A"}
            label="Your Share Balance (on-chain)"
            isDecrypted={isDecrypted}
            onDecrypt={handleDecrypt}
            isDecrypting={isDecrypting || isInitializing}
          />
          {decryptError && <p className="text-destructive text-xs font-mono mt-2">{decryptError}</p>}
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="text-xs font-mono text-muted-foreground mb-1">Portfolio Value</div>
            <div className={`text-xl font-mono font-bold ${isDecrypted ? "" : "blur-sm select-none"}`}>
              {isDecrypted ? `${portfolioValueEth.toFixed(4)} ETH` : "N/A"}
            </div>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="text-xs font-mono text-muted-foreground mb-1">Ownership</div>
            <div className={`text-xl font-mono font-bold ${isDecrypted ? "" : "blur-sm select-none"}`}>
              {isDecrypted ? `${ownershipPct.toFixed(2)}%` : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {isDecrypted && shares === 0 && (
        <div className="p-4 border border-border rounded-md text-sm font-mono text-muted-foreground">
          No shares yet.{" "}
          <Link href="/explore" className="text-primary hover:underline">Buy shares on Explore</Link>
        </div>
      )}

      {isDecrypted && isNearCap && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm font-mono">
            <span className="text-yellow-400 font-bold block">Approaching Ownership Cap</span>
            <span className="text-muted-foreground text-xs">
              You own {ownershipPct.toFixed(2)}% of total shares. The protocol enforces a 20% maximum on-chain.
            </span>
          </div>
        </div>
      )}

      {profileLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : profile && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Activity />} label="Transactions" value={profile.transactionCount.toString()} />
          <StatCard icon={<Banknote />} label="Dividend Rounds" value={profile.dividendRoundsParticipated.toString()} />
          <StatCard icon={<TrendingUp />} label="Member Since" value={formatDate(profile.registeredAt).split(",")[0]} />
        </div>
      )}

      <section>
        <h2 className="font-mono font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Your Transactions</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          {txLoading ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : transactions?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">No transactions recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Event</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Tx Hash</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map(tx => (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/20 transition-colors">
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
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border border-emerald-500/25 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-emerald-500/5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Banknote className="w-4 h-4 text-emerald-500" />
              Accrued Dividend Payout
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Your share from the latest on-chain round. Decrypt to view the amount, then claim as {tokenLabel}.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {!isDividendDecrypted ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Payout amount</p>
                    <p className="font-mono text-2xl font-bold text-muted-foreground/40 blur-sm select-none mt-0.5">
                      ••••••
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecryptDividend}
                  disabled={isDecryptingDividend || !isConfigured || !instance}
                  className="font-mono text-xs gap-1.5 shrink-0 w-full sm:w-auto"
                >
                  <Lock className="w-3 h-3" />
                  {isDecryptingDividend ? "Decrypting..." : "Decrypt Payout"}
                </Button>
              </div>
            ) : hasClaimableDividend ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Unlock className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ready to claim</p>
                    <p className="font-mono text-3xl font-bold text-emerald-500 mt-0.5">
                      {formattedDividendPayout} <span className="text-lg text-emerald-500/80">{tokenLabel}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    size="sm"
                    disabled={isClaiming}
                    className="font-mono text-xs w-full sm:w-auto"
                    onClick={async () => {
                      if (!address || !signer) return;
                      setIsClaiming(true);
                      setClaimTxHash(null);
                      setDividendError("");
                      try {
                        const receipt = await claimDividend(DEFAULT_PROPERTY_ID);
                        setClaimTxHash(receipt.hash);
                        const refreshed = await readDividendPayout(DEFAULT_PROPERTY_ID, address, signer);
                        setDividendPayout(refreshed);
                        setIsDividendDecrypted(true);
                        void queryClient.invalidateQueries({
                          queryKey: getGetInvestorDividendsQueryKey(address),
                        });
                        void queryClient.invalidateQueries({
                          queryKey: getGetInvestorProfileQueryKey(address),
                        });
                      } catch (err) {
                        setDividendError(err instanceof Error ? err.message : "Claim failed");
                      } finally {
                        setIsClaiming(false);
                      }
                    }}
                  >
                    {isClaiming ? "Claiming..." : `Claim ${formattedDividendPayout} ${tokenLabel}`}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDecryptDividend}
                    disabled={isDecryptingDividend}
                    className="font-mono text-xs text-muted-foreground w-full sm:w-auto"
                  >
                    Refresh amount
                  </Button>
                </div>
              </>
            ) : isWaitingForNextPayout ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {claimTxHash ? "Claimed — waiting for next round" : "Accrued payout"}
                    </p>
                    <p className="font-mono text-3xl font-bold text-muted-foreground mt-0.5">
                      0.00 <span className="text-lg text-muted-foreground/80">{tokenLabel}</span>
                    </p>
                  </div>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  {claimTxHash
                    ? "Your last payout was claimed on-chain. A new amount will appear here after the admin distributes the next dividend round."
                    : "No accrued payout right now. Check back after the next dividend distribution."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecryptDividend}
                  disabled={isDecryptingDividend}
                  className="font-mono text-xs w-full sm:w-auto"
                >
                  {isDecryptingDividend ? "Refreshing..." : "Refresh payout"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-mono text-sm text-foreground">No payout to claim</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    Decrypt to check if a dividend round has been distributed to you.
                  </p>
                </div>
              </div>
            )}

            {claimTxHash && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">Claimed successfully.</span>
                <a
                  href={sepoliaTxUrl(claimTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 ml-auto shrink-0"
                >
                  Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {dividendError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {dividendError}
              </div>
            )}
          </div>
        </div>

        <div>
        <h2 className="font-mono font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Dividend Participation</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          {divLoading ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : dividendRecords?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">No dividend rounds yet</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Round</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Payout</th>
                  <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {dividendRecords?.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-primary font-bold">#{r.roundNumber}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Encrypted on-chain
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(r.distributedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
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
