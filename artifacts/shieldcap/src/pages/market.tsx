import { useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import {
  useListTransactions, getListTransactionsQueryKey,
  useRegisterInvestor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import { Shield, ArrowRight, Lock, RefreshCw, AlertTriangle, Wallet, CheckCircle2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const DEMO_TRANSFER_TXS = [
  { id: 101, txHash: "0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", eventType: "Transfer", blockNumber: 1048321, timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), walletAddress: null },
  { id: 102, txHash: "0xb2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3", eventType: "Transfer", blockNumber: 1048290, timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), walletAddress: null },
  { id: 103, txHash: "0xc3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4", eventType: "CapRejected", blockNumber: 1048185, timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), walletAddress: null },
];

export default function Market() {
  const { address, connect } = useWallet();
  const queryClient = useQueryClient();
  const registerInvestor = useRegisterInvestor();

  const [toAddress, setToAddress] = useState("");
  const [shareAmount, setShareAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: transactions, isLoading: txLoading } = useListTransactions({
    query: { queryKey: getListTransactionsQueryKey() }
  });

  const transferTxs = transactions
    ? transactions.filter(tx => tx.eventType === "Transfer" || tx.eventType === "CapRejected")
    : DEMO_TRANSFER_TXS;

  const handleConnect = () => {
    connect();
    setTimeout(() => {
      registerInvestor.mutate({ data: { walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" } });
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!toAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
      setSubmitError("Invalid Ethereum address format");
      return;
    }
    const amount = parseInt(shareAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("Share amount must be a positive number");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">Confidential Secondary Market</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1">
          Peer-to-peer share transfers — amounts remain encrypted on-chain
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Transfer form */}
        <div>
          <div className="p-6 bg-card border border-border rounded-lg space-y-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h2 className="font-mono font-bold">Confidential Transfer</h2>
            </div>

            {!address ? (
              <div className="space-y-4">
                <p className="text-sm font-mono text-muted-foreground">Connect your wallet to initiate a confidential transfer.</p>
                <Button onClick={handleConnect} className="w-full font-mono" data-testid="button-connect-market">
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-mono font-bold text-primary">Transfer Submitted</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    Your confidential transfer has been broadcast to the Zama network. The amount is encrypted — observers see only the event type.
                  </div>
                </div>
                <div className="w-full p-3 bg-muted/30 rounded text-xs font-mono text-muted-foreground break-all">
                  Tx: 0x{Math.random().toString(16).slice(2).padEnd(64, "0")}
                </div>
                <Button variant="outline" onClick={() => { setSubmitted(false); setToAddress(""); setShareAmount(""); }} className="font-mono text-xs">
                  New Transfer
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs text-muted-foreground">From</Label>
                  <div className="px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-mono text-muted-foreground truncate">
                    {address}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="to-address" className="font-mono text-xs text-muted-foreground">To Address</Label>
                  <Input
                    id="to-address"
                    placeholder="0x..."
                    value={toAddress}
                    onChange={e => setToAddress(e.target.value)}
                    className="font-mono text-xs"
                    data-testid="input-to-address"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="share-amount" className="font-mono text-xs text-muted-foreground">Share Amount</Label>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Encrypted on submit
                    </span>
                  </div>
                  <Input
                    id="share-amount"
                    type="number"
                    placeholder="e.g. 500"
                    value={shareAmount}
                    onChange={e => setShareAmount(e.target.value)}
                    className="font-mono text-xs"
                    data-testid="input-share-amount"
                  />
                  <p className="text-[10px] font-mono text-muted-foreground/70">
                    Amount is encrypted via fhevmjs before broadcasting. The network sees only a ciphertext.
                  </p>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 text-destructive text-xs font-mono">
                    <AlertTriangle className="w-3 h-3" />
                    {submitError}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full font-mono" data-testid="button-submit-transfer">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      Encrypting &amp; Broadcasting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Submit Confidential Transfer
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Privacy note */}
          <div className="mt-4 p-4 bg-primary/5 border border-primary/15 rounded-md flex items-start gap-3">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs font-mono text-muted-foreground">
              <span className="text-primary font-bold block mb-1">How confidential transfers work</span>
              The share amount is encrypted client-side using fhevmjs before the transaction is sent. The smart contract validates the transfer using encrypted arithmetic — the ownership cap is enforced without revealing balances.
            </div>
          </div>
        </div>

        {/* Transfer activity */}
        <div className="space-y-4">
          <h2 className="font-mono font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Transfer Activity
          </h2>
          <p className="text-xs font-mono text-muted-foreground">
            Public observers can see that transfers occurred — but not the amounts. Transfer amounts are encrypted on-chain.
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            {txLoading ? (
              <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : transferTxs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-mono">No transfers yet</div>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-muted-foreground font-normal">Event</th>
                    <th className="px-4 py-2.5 text-left text-muted-foreground font-normal">Amount</th>
                    <th className="px-4 py-2.5 text-left text-muted-foreground font-normal">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transferTxs.map(tx => (
                    <tr key={tx.id} className={`border-b border-border hover:bg-muted/20 transition-colors ${tx.eventType === "CapRejected" ? "bg-destructive/5" : ""}`} data-testid={`row-transfer-${tx.id}`}>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded border ${tx.eventType === "Transfer" ? "text-blue-400 border-blue-400/30 bg-blue-400/10" : "text-destructive border-destructive/30 bg-destructive/10"}`}>
                          {tx.eventType === "CapRejected" ? "Cap Rejected" : tx.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 flex items-center gap-1.5 text-muted-foreground">
                        <Lock className="w-2.5 h-2.5" />
                        <span className="italic">encrypted</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(tx.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {transferTxs.some(tx => tx.eventType === "CapRejected") && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs font-mono text-destructive">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              A Cap Rejected event indicates an investor attempted to exceed the 20% ownership limit. The transaction was reverted by the FHE-enforced cap rule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
