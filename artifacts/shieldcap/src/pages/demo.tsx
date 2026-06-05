import { useState } from "react";
import {
  useGetProperty, getGetPropertyQueryKey,
  useGetPropertyMetrics, getGetPropertyMetricsQueryKey,
  useListDividendRounds, getListDividendRoundsQueryKey,
  useTriggerDividendDistribution,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Shield, CheckCircle2, ChevronRight, Lock, Eye, EyeOff, Zap, AlertTriangle, Banknote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DEMO_STEPS = [
  {
    id: 1,
    title: "Deploy the Property",
    description: "The ShieldCapProperty contract is deployed to the Zama Devnet. It initializes 50,000 shares and sets the 20% ownership cap.",
    code: `// ShieldCapProperty.sol
contract ShieldCapProperty is Ownable {
  uint256 public constant TOTAL_SHARES = 50_000;
  uint256 public constant MAX_OWNERSHIP_BPS = 2_000; // 20%
  
  // Encrypted balances — no public inspection
  mapping(address => euint64) private _encryptedBalances;
  uint256 public dividendRound;
}`,
    publicData: "Property deployed at 0x0...000",
    privateData: null,
    tag: "Deploy",
  },
  {
    id: 2,
    title: "Investors Purchase Shares",
    description: "Three investors purchase shares. Each purchase amount is encrypted via fhevmjs before the transaction — the contract adds to their encrypted balance.",
    code: `function purchaseShares(
  einput encryptedAmount,
  bytes calldata proof
) external payable {
  euint64 amount = FHE.asEuint64(encryptedAmount, proof);
  euint64 current = _encryptedBalances[msg.sender];
  euint64 newBalance = FHE.add(current, amount);
  
  // Ownership cap check via FHE
  ebool withinCap = _checkOwnershipCap(newBalance);
  require(FHE.decrypt(withinCap), "Cap exceeded");
  
  _encryptedBalances[msg.sender] = newBalance;
  FHE.allow(newBalance, msg.sender); // grant decrypt permission
}`,
    publicData: "3 × SharesPurchased events emitted",
    privateData: "Investor balances: [ENCRYPTED], [ENCRYPTED], [ENCRYPTED]",
    tag: "Purchase",
  },
  {
    id: 3,
    title: "Public Dashboard — Metrics Only",
    description: "The public dashboard shows aggregate metrics: total shares issued, transaction count, dividend rounds. No investor data is visible.",
    code: null,
    publicData: "totalShares: 50,000 | transactions: 3 | investors: 3",
    privateData: "investorBalances: [ALL ENCRYPTED]",
    tag: "Public View",
    isPublicDashboard: true,
  },
  {
    id: 4,
    title: "Ownership Balances Are Hidden",
    description: "Any attempt to inspect ownership balances returns only encrypted ciphertext — euint64 handles. Only the owning wallet can decrypt.",
    code: `// Reading a balance on-chain
euint64 balance = _encryptedBalances[investor];
// balance is a ciphertext handle — NOT readable by anyone

// On-chain computation still works:
ebool underCap = FHE.lt(balance, maxBalance);
// The contract can compare without decrypting`,
    publicData: "balanceOf(0xInvestorA) = [euint64 handle]",
    privateData: "Only 0xInvestorA can decrypt their own balance",
    tag: "Encryption",
  },
  {
    id: 5,
    title: "Revenue Added to Property",
    description: "The property owner records $100,000 in monthly revenue. This triggers the dividend distribution calculation.",
    code: `// Property owner records revenue
function addRevenue(uint256 amount) external onlyOwner {
  totalRevenue += amount;
  emit RevenueRecorded(amount);
}`,
    publicData: "Revenue: $100,000",
    privateData: "Individual shares of revenue: [COMPUTED ENCRYPTED]",
    tag: "Revenue",
  },
  {
    id: 6,
    title: "Dividends Distributed",
    description: "Dividends are computed over encrypted balances using FHE arithmetic. Each investor's payout is proportional to their encrypted share count — no plaintext involved.",
    code: `function distributeDividend(
  uint256 totalRevenue
) external onlyOwner {
  for each investor:
    euint64 balance = _encryptedBalances[investor];
    euint64 payout = FHE.div(
      FHE.mul(balance, encryptedRevenue),
      TOTAL_SHARES
    );
    _encryptedDividends[investor] = payout;
    FHE.allow(payout, investor);
  dividendRound++;
}`,
    publicData: "DividendDistributed event: round=1, totalRevenue=$100,000",
    privateData: "Per-investor payouts: [ENCRYPTED] [ENCRYPTED] [ENCRYPTED]",
    tag: "Dividend",
  },
  {
    id: 7,
    title: "Investors See Only Their Own Payout",
    description: "Each investor uses their wallet key via fhevmjs to decrypt only their own dividend payout. No investor can decrypt another's.",
    code: `// Frontend — fhevmjs decryption
const instance = await createInstance({ chainId });
const keypair = instance.generateKeypair();

// Investor signs EIP-712 permit
const result = await instance.reencrypt(
  contractAddress,
  "dividendOf",
  [investorAddress],
  keypair
);
// result = BigInt — investor's plaintext payout`,
    publicData: "Round 1 distributed: $100,000",
    privateData: "Investor A decrypts: $16,900 | B: [encrypted] | C: [encrypted]",
    tag: "Decrypt",
  },
  {
    id: 8,
    title: "Confidential Transfer",
    description: "Investor A transfers shares to Investor B. The amount is encrypted before sending. Observers see only a Transfer event — not the quantity.",
    code: `function transferShares(
  address to,
  einput encryptedAmount,
  bytes calldata proof
) external returns (bool) {
  euint64 amount = FHE.asEuint64(encryptedAmount, proof);
  euint64 fromBal = _encryptedBalances[msg.sender];
  euint64 toBal   = _encryptedBalances[to];
  
  ebool canTransfer = FHE.le(amount, fromBal);
  
  _encryptedBalances[msg.sender] = FHE.select(
    canTransfer,
    FHE.sub(fromBal, amount),
    fromBal
  );
  _encryptedBalances[to] = FHE.select(
    canTransfer,
    FHE.add(toBal, amount),
    toBal
  );
  return FHE.decrypt(canTransfer);
}`,
    publicData: "ConfidentialTransfer(from=0xA, to=0xB) — no amount",
    privateData: "Transfer amount: [ENCRYPTED]",
    tag: "Transfer",
  },
  {
    id: 9,
    title: "Ownership Cap Rejected",
    description: "Investor C attempts to buy shares that would push them above the 20% cap (10,000 shares). The FHE comparison detects the violation and reverts — without revealing C's actual balance.",
    code: `function _checkOwnershipCap(
  euint64 newBalance
) internal view returns (ebool) {
  // Max allowed: 20% of 50,000 = 10,000
  euint64 maxAllowed = FHE.asEuint64(10_000);
  
  // Comparison runs on encrypted values
  ebool withinCap = FHE.le(newBalance, maxAllowed);
  return withinCap;
  // No balance is revealed during this check
}`,
    publicData: "OwnershipCapRejected(buyer=0xC)",
    privateData: "C's balance after attempted purchase: [NEVER COMPUTED — REJECTED]",
    tag: "Cap Enforcement",
    isRejected: true,
  },
  {
    id: 10,
    title: "Encrypted Data Never Goes Public",
    description: "Throughout every operation — purchases, dividends, transfers, cap checks — no plaintext balance ever appears on-chain. The protocol functions correctly over encrypted state.",
    code: `// Summary of what remains encrypted:
// - _encryptedBalances[every investor]  → euint64
// - _encryptedDividends[every investor] → euint64
// - Transfer amounts                    → euint64 (in-tx only)
// - Cap comparisons                     → ebool (result consumed, not stored)
//
// What is public:
// - Event types (Purchase, Transfer, Dividend, CapRejected)
// - Total revenue distributed
// - Dividend round number
// - Transaction count`,
    publicData: "Zero investor data leaked",
    privateData: "All investor state: encrypted via Zama fhEVM",
    tag: "Result",
  },
];

export default function Demo() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const { data: property, isLoading: propLoading } = useGetProperty({ query: { queryKey: getGetPropertyQueryKey() } });
  const { data: metrics } = useGetPropertyMetrics({ query: { queryKey: getGetPropertyMetricsQueryKey() } });
  const { data: dividendRounds } = useListDividendRounds({ query: { queryKey: getListDividendRoundsQueryKey() } });
  const triggerDividend = useTriggerDividendDistribution();

  const currentStep = DEMO_STEPS[activeStep];

  const advance = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    if (activeStep === 5) {
      // Step 6: trigger an actual dividend distribution
      triggerDividend.mutate(
        { data: { revenueUsd: 100000, txHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}` } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDividendRoundsQueryKey() });
          }
        }
      );
    }
    if (activeStep < DEMO_STEPS.length - 1) setActiveStep(s => s + 1);
  };

  const reset = () => {
    setActiveStep(0);
    setCompletedSteps(new Set());
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">Interactive Demo</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1">
          Walk through the ShieldCap protocol narrative — 10 steps showing how FHE preserves privacy at every stage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Step list */}
        <div className="md:col-span-1 space-y-1">
          {DEMO_STEPS.map((step, idx) => {
            const done = completedSteps.has(idx);
            const active = idx === activeStep;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                data-testid={`step-${step.id}`}
                className={`w-full text-left px-3 py-2 rounded-md transition-all flex items-center gap-2 text-xs font-mono ${
                  active ? "bg-primary/10 border border-primary/30 text-primary" :
                  done ? "text-muted-foreground hover:bg-muted/30" :
                  "text-muted-foreground/60 hover:bg-muted/20"
                }`}
              >
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                  done ? "bg-primary border-primary text-primary-foreground" :
                  active ? "border-primary text-primary" :
                  "border-border text-muted-foreground"
                }`}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : step.id}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            );
          })}

          <div className="pt-4">
            <Button variant="outline" size="sm" onClick={reset} className="w-full font-mono text-xs">
              Reset Demo
            </Button>
          </div>
        </div>

        {/* Step detail */}
        <div className="md:col-span-3 space-y-6">
          <div className={`p-1 rounded-md border inline-flex font-mono text-xs ${
            currentStep.isRejected ? "bg-destructive/10 border-destructive/30 text-destructive" :
            "bg-primary/10 border-primary/30 text-primary"
          }`}>
            {currentStep.tag}
          </div>

          <div>
            <h2 className="text-xl font-bold font-mono mb-2">
              Step {currentStep.id}: {currentStep.title}
            </h2>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Live data panel for step 3 */}
          {currentStep.isPublicDashboard && (
            <div className="p-4 bg-card border border-border rounded-lg space-y-3">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Live Protocol Data</div>
              {propLoading ? (
                <Skeleton className="h-20" />
              ) : property && metrics ? (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Property Value" value={formatCurrency(property.valueUsd)} />
                  <Stat label="Total Shares" value={metrics.totalSharesIssued.toLocaleString()} />
                  <Stat label="Investors" value={metrics.investorCount.toString()} />
                  <Stat label="Transactions" value={metrics.totalTransactions.toString()} />
                </div>
              ) : null}
            </div>
          )}

          {/* Solidity code */}
          {currentStep.code && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                <span className="ml-2 text-xs font-mono text-muted-foreground">ShieldCapProperty.sol</span>
              </div>
              <pre className="p-4 text-xs font-mono text-foreground/90 overflow-x-auto leading-relaxed bg-muted/10">
                <code>{currentStep.code}</code>
              </pre>
            </div>
          )}

          {/* Public vs Private data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                <Eye className="w-3 h-3" />
                Public (on-chain)
              </div>
              <div className="text-sm font-mono text-foreground/90">{currentStep.publicData}</div>
            </div>
            <div className="p-4 bg-muted/10 border border-border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                <EyeOff className="w-3 h-3" />
                Private (FHE encrypted)
              </div>
              <div className={`text-sm font-mono ${currentStep.privateData ? "text-muted-foreground italic" : "text-emerald-400"}`}>
                {currentStep.privateData ?? "No sensitive data exposed"}
              </div>
            </div>
          </div>

          {/* FHE guarantee badge */}
          <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/15 rounded-md">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-mono text-muted-foreground">
              <span className="text-primary font-bold">Zama fhEVM guarantee: </span>
              All FHE operations run on the co-processor network — the EVM sees only ciphertext handles, never plaintext values.
            </p>
          </div>

          {/* Live dividend round display for step 6 */}
          {activeStep === 5 && dividendRounds && dividendRounds.length > 0 && (
            <div className="p-4 bg-emerald-400/5 border border-emerald-400/20 rounded-lg animate-in fade-in duration-500">
              <div className="text-xs font-mono text-emerald-400 mb-2 flex items-center gap-2">
                <Banknote className="w-3 h-3" />
                Latest Dividend Round (Live)
              </div>
              <div className="text-sm font-mono">
                Round #{dividendRounds[0].roundNumber} — {formatCurrency(dividendRounds[0].totalDistributedUsd)} distributed
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs"
              onClick={() => setActiveStep(s => Math.max(0, s - 1))}
              disabled={activeStep === 0}
            >
              Previous
            </Button>

            {activeStep < DEMO_STEPS.length - 1 ? (
              <Button
                onClick={advance}
                className="font-mono"
                data-testid={`button-step-${currentStep.id}`}
              >
                {triggerDividend.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Next: {DEMO_STEPS[activeStep + 1].title.split(":")[0]}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            ) : (
              <Button onClick={reset} variant="outline" className="font-mono">
                <Zap className="w-4 h-4 mr-2" />
                Run Demo Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/20 rounded border border-border">
      <div className="text-[10px] font-mono text-muted-foreground mb-1">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
}
