import { Link } from "wouter";
import { Shield, Lock, TrendingUp, Users, ArrowRight, ChevronRight, Eye, EyeOff, Zap, Building, RefreshCw, Banknote, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetPropertyMetrics, getGetPropertyMetricsQueryKey, useGetProperty, getGetPropertyQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useWallet } from "@/contexts/wallet-context";

export default function Landing() {
  const { data: metrics } = useGetPropertyMetrics({ query: { queryKey: getGetPropertyMetricsQueryKey() } });
  const { data: property } = useGetProperty({ query: { queryKey: getGetPropertyQueryKey() } });
  const { connect, address } = useWallet();

  return (
    <div className="flex flex-col">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 pt-20 pb-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Powered by Zama Fully Homomorphic Encryption
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight font-sans leading-tight mb-6">
              Own Real Estate
              <br />
              <span className="gradient-text">Completely Private</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
              ShieldCap brings institutional real-estate fractional ownership on-chain — with encrypted balances, confidential transfers, and FHE-enforced ownership caps. No one can see your holdings but you.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="font-mono gap-2 text-sm">
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="font-mono gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  Interactive Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            <StatBar label="Asset Value" value={property ? formatCurrency(property.valueUsd) : "$5,000,000"} />
            <StatBar label="Total Shares" value={property ? formatNumber(property.totalShares) : "50,000"} />
            <StatBar label="Investors" value={metrics ? metrics.investorCount.toString() : "3"} />
            <StatBar label="Revenue Distributed" value={metrics ? formatCurrency(metrics.totalRevenueDistributedUsd) : "$195,000"} />
          </div>
        </div>
      </section>

      {/* ── PROPERTY SHOWCASE ────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
              <Building className="w-3.5 h-3.5" />
              Featured Property
            </div>
            <h2 className="text-3xl font-bold font-sans tracking-tight">
              Kampala Heights Apartments
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A premium mixed-use residential complex in Kampala's Nakasero district. 120 luxury units across 12 floors with panoramic views. Fully leased with AAA-rated anchor tenants generating consistent monthly revenue.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Asset Value", value: "$5,000,000" },
                { label: "Price / Share", value: "$100" },
                { label: "Total Shares", value: "50,000" },
                { label: "Max Ownership", value: "20%" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-lg border border-border bg-card">
                  <div className="text-xs font-mono text-muted-foreground mb-1">{s.label}</div>
                  <div className="font-bold text-lg font-mono">{s.value}</div>
                </div>
              ))}
            </div>

            <Link href="/property">
              <Button variant="outline" className="font-mono gap-2">
                View Property Details
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <img
                src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80"
                alt="Kampala Heights Apartments"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-white text-sm font-mono font-bold">Kampala, Uganda</span>
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-mono rounded">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5" />
              Privacy Architecture
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Privacy at every layer</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Zama's fhEVM allows smart contracts to run arithmetic and comparisons on encrypted data — no decryption at any point.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Lock className="w-5 h-5" />}
              title="Encrypted Balances"
              description="Share holdings stored as euint64 ciphertext on-chain. Only you can decrypt with your wallet key."
            />
            <FeatureCard
              icon={<RefreshCw className="w-5 h-5" />}
              title="Confidential Transfers"
              description="Transfer amounts never appear in plaintext. TFHE.select moves balances without revealing quantities."
            />
            <FeatureCard
              icon={<Banknote className="w-5 h-5" />}
              title="Private Dividends"
              description="Revenue distributed proportionally using FHE arithmetic. Per-investor payouts are encrypted."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="FHE Cap Enforcement"
              description="The 20% ownership cap is enforced via TFHE.le — no balance is revealed during the check."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">How ShieldCap works</h2>
          <p className="text-muted-foreground mt-3">Three steps to private real-estate ownership</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-border" />
          {[
            {
              step: "01",
              icon: <Users className="w-6 h-6" />,
              title: "Connect & Register",
              desc: "Connect your wallet. Your address is registered on-chain — no personal data required.",
            },
            {
              step: "02",
              icon: <Lock className="w-6 h-6" />,
              title: "Purchase Encrypted Shares",
              desc: "Buy shares with an FHE-encrypted amount. Your balance is stored as ciphertext — invisible to all observers.",
            },
            {
              step: "03",
              icon: <TrendingUp className="w-6 h-6" />,
              title: "Earn Private Dividends",
              desc: "Receive proportional revenue distributions computed over encrypted balances. Decrypt only your own payout.",
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="relative flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-primary/20 bg-primary/5 flex items-center justify-center text-primary relative z-10">
                {icon}
              </div>
              <div className="text-xs font-mono text-primary font-bold">{step}</div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PUBLIC vs PRIVATE ─────────────────────────────── */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">What the world sees vs. what you see</h2>
            <p className="text-muted-foreground mt-3">FHE guarantees that privacy is enforced at the cryptographic level — not just hidden from a UI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Public (everyone sees)
              </div>
              <ul className="space-y-3">
                {[
                  "SharesPurchased event emitted",
                  "ConfidentialTransfer event emitted",
                  "DividendDistributed: $100,000",
                  "Total transaction count: 7",
                  "Dividend round: #2",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <EyeOff className="w-4 h-4" />
                Private (only you see)
              </div>
              <ul className="space-y-3">
                {[
                  "Your share balance: 8,450 shares",
                  "Your portfolio value: $845,000",
                  "Your ownership: 16.9%",
                  "Your dividend payout: $16,900",
                  "Your transfer amount: encrypted",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Start investing privately today</h2>
          <p className="text-muted-foreground leading-relaxed">
            Connect your wallet, purchase shares, and watch the protocol work — your balance stays encrypted at all times.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {address ? (
              <Link href="/dashboard">
                <Button size="lg" className="font-mono gap-2">
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={connect} className="font-mono gap-2">
                Connect Wallet
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            <Link href="/demo">
              <Button variant="outline" size="lg" className="font-mono gap-2">
                <Zap className="w-4 h-4" />
                See the Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-8 py-6 flex flex-col gap-1">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all group space-y-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
