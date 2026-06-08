import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Shield, Lock, TrendingUp, Users, ArrowRight, Zap,
  Building, RefreshCw, Banknote, CheckCircle2, Eye, EyeOff,
  AlertTriangle, Globe, FileX, Server, Key, ChevronDown,
  Activity, BarChart3, Layers, GitMerge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useListDividendRounds, getListDividendRoundsQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useWallet } from "@/contexts/wallet-context";
import { usePropertyById, useOnChainPropertyStats } from "@/hooks/use-marketplace";
import { useCountUp } from "@/hooks/use-count-up";
import { useInView } from "@/hooks/use-in-view";

/* ── helpers ─────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── animated FHE flow diagram ────────────── */
function FHEFlowDiagram() {
  const [step, setStep] = useState(-1);
  const [tick, setTick] = useState(0); // increment to force replay
  const { ref, inView } = useInView();

  // Start on first visibility
  useEffect(() => {
    if (!inView) return;
    const timer = setTimeout(() => setStep(0), 400);
    return () => clearTimeout(timer);
  }, [inView]);

  // Advance step automatically
  useEffect(() => {
    if (step < 0 || step >= 4) return;
    const t = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [step, tick]);

  // Replay: reset to -1 then immediately start at 0
  const replay = () => {
    setStep(-1);
    setTimeout(() => setStep(0), 80);
    setTick(t => t + 1);
  };

  const nodes = [
    { id: 0, icon: <Users className="w-5 h-5" />, label: "Investor", sub: "encrypted amt", color: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300" },
    { id: 1, icon: <Key className="w-5 h-5" />, label: "FHE Encrypt", sub: "relayer SDK", color: "bg-primary/5 border-primary/30 text-primary" },
    { id: 2, icon: <Lock className="w-5 h-5" />, label: "Ciphertext", sub: "0x4F2A…", color: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300" },
    { id: 3, icon: <Server className="w-5 h-5" />, label: "Smart Contract", sub: "FHE ops", color: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300" },
    { id: 4, icon: <Shield className="w-5 h-5" />, label: "Encrypted Storage", sub: "euint64 mapping", color: "bg-primary/5 border-primary/30 text-primary" },
  ];

  const stepLabels = [
    "1. Investor initiates",
    "2. Amount encrypted",
    "3. Ciphertext broadcast",
    "4. Contract processes",
    "5. Stored encrypted",
  ];

  return (
    <div ref={ref as any} className="relative">
      {/* Mobile: vertical flow */}
      <div className="flex flex-col gap-3 md:hidden">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-stretch gap-2">
            <div
              className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 text-center transition-all duration-500 ${node.color} ${step >= i ? "opacity-100 scale-100 shadow-md" : "opacity-30 scale-95"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`transition-all duration-300 ${step >= i ? "animate-pulse-glow" : ""}`}>{node.icon}</div>
              <div className="text-sm font-bold leading-tight">{node.label}</div>
              <div className="text-xs font-mono opacity-70">{node.sub}</div>
            </div>
            <p
              className={`text-center text-xs font-mono px-2 transition-opacity duration-500 ${step >= i ? "opacity-100 text-foreground" : "opacity-30 text-muted-foreground"}`}
            >
              {stepLabels[i]}
            </p>
            {i < nodes.length - 1 && (
              <div className="flex justify-center py-1">
                <ChevronDown className={`w-5 h-5 ${step > i ? "text-primary" : "text-border"}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-stretch justify-between gap-2">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center gap-2 flex-1 min-w-0 max-w-[11rem] lg:max-w-none">
            <div
              className={`flex-1 rounded-xl border-2 p-3 lg:p-4 flex flex-col items-center gap-2 text-center transition-all duration-500 ${node.color} ${step >= i ? "opacity-100 scale-100 shadow-md" : "opacity-30 scale-95"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`transition-all duration-300 ${step >= i ? "animate-pulse-glow" : ""}`}>{node.icon}</div>
              <div className="text-xs font-bold leading-tight">{node.label}</div>
              <div className="text-[10px] font-mono opacity-70 break-all">{node.sub}</div>
            </div>
            {i < nodes.length - 1 && (
              <svg width="20" height="24" viewBox="0 0 28 24" className="shrink-0 hidden lg:block">
                <line x1="0" y1="12" x2="28" y2="12" stroke="hsl(var(--border))" strokeWidth="2" />
                <polygon
                  points="18,6 28,12 18,18"
                  fill={step > i ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  className="transition-colors duration-300"
                />
                {step === i + 1 && (
                  <circle r="4" fill="hsl(var(--primary))" opacity="0.8">
                    <animateMotion dur="0.7s" path="M0,12 L28,12" />
                  </circle>
                )}
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Step labels — desktop only (mobile uses inline labels above) */}
      <div className="mt-6 hidden md:grid grid-cols-5 gap-2 text-center text-[11px] font-mono text-muted-foreground">
        {stepLabels.map((t, i) => (
          <div key={i} className={`transition-opacity duration-500 leading-snug px-1 ${step >= i ? "opacity-100 text-foreground" : "opacity-30"}`}>
            {t}
          </div>
        ))}
      </div>

      {/* Live values panel */}
      <div className={`mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-700 ${step >= 2 ? "opacity-100" : "opacity-0"}`}>
        {[
          { label: "Public sees", value: "SharesPurchased()", color: "text-foreground", bg: "bg-muted/50" },
          { label: "Amount visible?", value: "No, encrypted", color: "text-primary font-bold", bg: "bg-primary/5 border border-primary/20" },
          { label: "Balance stored", value: "euint64 handle", color: "text-purple-600 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { label: "Cap enforced", value: "FHE.select + le", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-lg p-3 ${bg}`}>
            <div className="text-[10px] font-mono text-muted-foreground mb-1">{label}</div>
            <div className={`text-xs font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={replay}
        className="mt-4 text-xs font-mono text-primary/70 hover:text-primary transition-colors flex items-center gap-1.5"
        data-testid="button-replay-diagram"
      >
        <RefreshCw className="w-3 h-3" /> Replay animation
      </button>
    </div>
  );
}

/* ── live counter stat ─────────────────────── */
function LiveStat({ label, prefix = "", suffix = "", value, decimals = 0 }: {
  label: string; prefix?: string; suffix?: string; value: number; decimals?: number;
}) {
  const { ref, inView } = useInView();
  const { count, start } = useCountUp(value, 2200);
  useEffect(() => { if (inView) start(); }, [inView]);

  const display = decimals > 0
    ? (count / Math.pow(10, decimals)).toFixed(decimals)
    : count.toLocaleString();

  return (
    <div ref={ref as any} className="flex flex-col gap-1.5 py-6 px-4 sm:py-8 sm:px-6 min-w-0">
      <div className="text-xs sm:text-sm text-muted-foreground font-mono leading-snug">{label}</div>
      <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-mono tabular-nums leading-tight break-words">
        <span className="text-primary">{prefix}</span>
        {display}
        <span className="text-muted-foreground text-base sm:text-lg md:text-2xl">{suffix}</span>
      </div>
    </div>
  );
}

/* ── problem card ────────────────────────── */
function ProblemCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group flex gap-4 p-5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/8 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

/* ── solution card ───────────────────────── */
function SolutionCard({ icon, title, body, delay = 0 }: { icon: React.ReactNode; title: string; body: string; delay?: number }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal reveal-delay-${delay} group p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-default`}>
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        {icon}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

/* ── step card ───────────────────────────── */
function StepCard({ n, icon, title, body, active, onClick }: {
  n: number; icon: React.ReactNode; title: string; body: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/30"}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono shrink-0 transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {n}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</span>
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <p className={`text-sm leading-relaxed transition-all duration-300 ${active ? "text-foreground" : "text-muted-foreground"}`}>{body}</p>
        </div>
      </div>
    </button>
  );
}

/* ── main component ──────────────────────── */
export default function Landing() {
  const { data: property } = usePropertyById(1);
  const { data: onChainStats } = useOnChainPropertyStats(1);
  const { data: dividendRounds } = useListDividendRounds({ query: { queryKey: getListDividendRoundsQueryKey() } });
  const { connect, address, isConnecting, error: walletError } = useWallet();
  const [activeStep, setActiveStep] = useState(0);
  const [privacyRevealed, setPrivacyRevealed] = useState(false);

  // scroll step cycling
  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 3), 3200);
    return () => clearInterval(t);
  }, []);

  const heroRef = useReveal();
  const problemRef = useReveal();
  const fheRef = useReveal();

  const investorCount = onChainStats?.investorCount ?? 0;
  const totalShares = property?.totalShares ?? 0;

  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* ══════════════════════════════════════════════════ HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">

        {/* Animated background shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-[5%] w-[520px] h-[520px] rounded-full bg-primary/6 blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 left-[10%] w-[350px] h-[350px] rounded-full bg-blue-500/5 blur-3xl" style={{ animation: "float-slow 8s ease-in-out infinite 2s" }} />
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:64px_64px] opacity-40 dark:opacity-20" />
          {/* Animated dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="hsl(var(--primary))" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left: copy */}
          <div ref={heroRef} className="reveal space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/8 text-primary text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Private fractional property ownership
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08]">
              Own Real Estate.<br />
              <span className="gradient-text">Stay Invisible.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Vielstate lets you own a slice of real estate without broadcasting your position to the world. Your balance, transfers, and dividends stay encrypted. Only you can see your numbers.
            </p>

            {/* Live mini-stats floating cards */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: <Building className="w-4 h-4" />, value: formatCurrency(property?.valueUsd ?? 0), label: "Listed property value" },
                { icon: <Users className="w-4 h-4" />, value: investorCount.toLocaleString(), label: "Investors" },
                { icon: <Lock className="w-4 h-4" />, value: "100% Encrypted", label: "All balances" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all animate-float" style={{ animationDelay: Math.random() * 1 + "s" }}>
                  <span className="text-primary">{c.icon}</span>
                  <div>
                    <div className="text-sm font-bold font-mono">{c.value}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/explore">
                <Button size="lg" className="gap-2 font-mono text-sm shadow-lg hover:shadow-primary/20 hover:shadow-xl transition-shadow">
                  Explore Listings
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/listings/1">
                <Button variant="outline" size="lg" className="gap-2 font-mono text-sm hover:border-primary/50 transition-colors">
                  <Zap className="w-4 h-4" />
                  See Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: property card */}
          <div className="relative animate-float-slow">
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=900&q=80"
                alt="Kampala Heights Apartments"
                className="w-full h-[420px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Floating encrypted badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white text-xs font-mono animate-pulse-glow">
                <Lock className="w-3 h-3 text-primary" />
                FHE Protected
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="text-xs font-mono text-white/70 mb-1">Kampala, Uganda</div>
                <div className="text-xl font-bold mb-3">Kampala Heights Apartments</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: formatCurrency(property?.valueUsd ?? 0), l: "Value" },
                    { v: formatNumber(totalShares), l: "Shares" },
                    { v: "1 tUSDC", l: "Per Share" },
                  ].map(s => (
                    <div key={s.l} className="bg-white/10 backdrop-blur rounded-lg p-2 text-center border border-white/10">
                      <div className="text-sm font-bold font-mono">{s.v}</div>
                      <div className="text-[10px] text-white/60">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating encrypted balance overlay */}
            <div className="absolute -right-4 top-12 bg-card border border-border rounded-xl p-4 shadow-xl w-48 animate-float" style={{ animationDelay: "1s" }}>
              <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-primary" />
                Demo preview
              </div>
              <div className="text-lg font-bold font-mono blur-sm select-none">████ shares</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">Connect wallet to see yours</div>
            </div>

            {/* Floating tx card */}
            <div className="absolute -left-4 bottom-16 bg-card border border-border rounded-xl p-3 shadow-xl w-44 animate-float" style={{ animationDelay: "2s" }}>
              <div className="text-[10px] font-mono text-muted-foreground mb-2">Latest Event</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">DividendDistributed</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">Amount: [ENCRYPTED]</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50">
          <span className="text-xs font-mono">Scroll to explore</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ LIVE STATS */}
      <section className="border-y border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            <div className="bg-card min-w-0">
              <LiveStat label="Listed Property Value" prefix="$" value={property?.valueUsd ?? 0} />
            </div>
            <div className="bg-card min-w-0">
              <LiveStat label="Share Cap" value={totalShares} />
            </div>
            <div className="bg-card min-w-0">
              <LiveStat label="On-Chain Investors" value={investorCount} />
            </div>
            <div className="bg-card min-w-0">
              <LiveStat label="Price / Share" value={property?.pricePerShare ?? 1} suffix=" tUSDC" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ PROBLEM STATEMENT */}
      <section className="py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={problemRef} className="reveal">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-destructive uppercase tracking-wider mb-5">
            <AlertTriangle className="w-3.5 h-3.5" />
            The On-Chain Exposure Problem
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Tokenized real estate on a public chain creates <span className="text-destructive">exposure many investors avoid</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                When real estate is tokenized on a public blockchain, your wallet holdings, transfer sizes, and dividend activity become visible to anyone with a block explorer. That permanent on-chain exposure is why many investors hesitate to bring property positions on-chain.
              </p>

              <div className="space-y-4">
                <ProblemCard
                  icon={<Eye className="w-5 h-5" />}
                  title="Public Share Exposure"
                  body="Any blockchain explorer can reveal exactly how many property shares each wallet holds on-chain, enabling targeted attacks and wealth profiling."
                />
                <ProblemCard
                  icon={<Globe className="w-5 h-5" />}
                  title="Transfer Amount Visibility"
                  body="Every on-chain share transfer broadcasts the exact quantity publicly. Your trading strategy is completely transparent."
                />
                <ProblemCard
                  icon={<FileX className="w-5 h-5" />}
                  title="Dividend Tracking"
                  body="On-chain revenue distributions can be correlated with balances to reverse-engineer ownership percentages and trading activity."
                />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-5">
                <Shield className="w-3.5 h-3.5" />
                The Vielstate difference
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Full privacy, enforced at the <span className="gradient-text">cryptographic level</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Zama's fhEVM lets smart contracts compute on encrypted data without ever decrypting it. Ownership caps are enforced, dividends are distributed, transfers are validated, all while your balance remains a ciphertext.
              </p>

              <div className="relative rounded-xl overflow-hidden border border-border shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80"
                  alt="Encrypted data visualization"
                  className="w-full h-52 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="font-mono text-xs text-primary font-bold mb-1">On-chain storage</div>
                  <div className="font-mono text-sm bg-muted/80 backdrop-blur px-3 py-2 rounded border border-border">
                    <span className="text-muted-foreground">balances[0x71C7…]</span> = <span className="text-purple-600 dark:text-purple-400">euint64(0x4F2A8BC1…)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ FHE EXPLAINER */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={fheRef} className="reveal">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-4">
                <Layers className="w-3.5 h-3.5" />
                How FHE Works
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Encrypted data, computed without decrypting
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Fully Homomorphic Encryption lets the smart contract add, subtract, compare, and divide encrypted numbers, producing correct results without ever seeing the plaintext values.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-sm">
              <FHEFlowDiagram />
            </div>

            {/* Mini explainers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[
                { icon: <GitMerge className="w-5 h-5" />, title: "Encrypted Arithmetic", body: "FHE.add(a, b) adds two encrypted numbers. The result is also encrypted. No plaintext ever leaves the ciphertext domain.", code: "FHE.add(balA, amount)" },
                { icon: <BarChart3 className="w-5 h-5" />, title: "Encrypted Comparisons", body: "FHE.le(balance, maxCap) compares encrypted values and returns an encrypted boolean, used to enforce the 20% ownership cap.", code: "FHE.le(newBal, maxAllowed)" },
                { icon: <Key className="w-5 h-5" />, title: "Selective Decryption", body: "FHE.allow(handle, wallet) grants only that wallet the right to decrypt their own balance. Everyone else sees ciphertext.", code: "FHE.allow(balance, investor)" },
              ].map(({ icon, title, body, code }) => (
                <div key={title} className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{icon}</div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{body}</p>
                  <div className="bg-muted rounded-lg px-3 py-2 font-mono text-xs text-primary">{code}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ PRIVACY REVEAL DEMO */}
      <section className="py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-5">
              <Eye className="w-3.5 h-3.5" />
              Try the demo
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Your balance, only yours to see
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Every other investor's balance, every transfer amount, every dividend payout is stored as a ciphertext handle. Only the holder of the wallet key can re-encrypt and decrypt their own data.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your wallet on Sepolia to decrypt your real FHE-protected on-chain balance.
            </p>
          </div>

          <div className="space-y-4">
            {/* Simulated blockchain explorer view */}
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-2">Block Explorer (Public View)</span>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { field: "balances[0x71C7…6F]", value: "euint64(0x4F2A8BC1D3E7F…)", encrypted: true },
                  { field: "balances[0x2B5A…CF]", value: "euint64(0xA18C3D02B4F9…)", encrypted: true },
                  { field: "balances[0x6813…69]", value: "euint64(0x77EF6201A5D3…)", encrypted: true },
                  { field: "dividendRound", value: "2", encrypted: false },
                  { field: "totalShares", value: "50000", encrypted: false },
                ].map(row => (
                  <div key={row.field} className="flex items-start justify-between gap-4 text-xs font-mono py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground shrink-0">{row.field}</span>
                    <span className={row.encrypted ? "text-purple-600 dark:text-purple-400 truncate" : "text-foreground"}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Private view toggle */}
            <div className={`rounded-xl border-2 overflow-hidden shadow-sm transition-all duration-500 ${privacyRevealed ? "border-primary/40 shadow-primary/10 shadow-lg" : "border-border"}`}>
              <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <Lock className="w-3 h-3 text-primary" />
                  Demo: your private view
                </div>
                <Button
                  size="sm"
                  variant={privacyRevealed ? "secondary" : "default"}
                  className="text-xs font-mono gap-1.5 h-7"
                  onClick={() => setPrivacyRevealed(r => !r)}
                  data-testid="button-toggle-privacy"
                >
                  {privacyRevealed ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Decrypt</>}
                </Button>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { field: "Your share balance", encrypted: "euint64(0x4F2A8BC1…)", plain: "8,450 shares", highlight: true },
                  { field: "Portfolio value", encrypted: "euint64(0x7F3B1…)", plain: "$845,000", highlight: true },
                  { field: "Ownership", encrypted: "euint64(0xA3…)", plain: "16.9%", highlight: false },
                  { field: "Dividend (Round 2)", encrypted: "euint64(0xB8…)", plain: "$16,028", highlight: false },
                ].map(row => (
                  <div key={row.field} className="flex items-center justify-between gap-4 text-xs font-mono py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground shrink-0">{row.field}</span>
                    <span className={`font-bold transition-all duration-700 ${privacyRevealed ? (row.highlight ? "text-primary" : "text-foreground") : "blur-sm text-purple-600 dark:text-purple-400 select-none"}`}>
                      {privacyRevealed ? row.plain : row.encrypted}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground text-center">
              {privacyRevealed
                ? "This panel is a demo preview. Connect your wallet on Portfolio to load your real balance."
                : "Run the demo: connect your wallet on Portfolio to decrypt and view your holdings."}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ FEATURES */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5" />
              Protocol Features
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Privacy at every protocol layer</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              Every step (buying, holding, transferring, earning) keeps your amounts private on the blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <SolutionCard delay={1} icon={<Lock className="w-5 h-5" />} title="Encrypted Balances"
              body="Share holdings stored as euint64 on-chain. Observers see only the ciphertext handle, never the number." />
            <SolutionCard delay={2} icon={<RefreshCw className="w-5 h-5" />} title="Confidential Transfers"
              body="FHE.select() conditionally transfers shares without branching on plaintext. Amount never exposed." />
            <SolutionCard delay={3} icon={<Banknote className="w-5 h-5" />} title="Private Dividends"
              body="FHE.mul/div computes proportional payouts over encrypted balances. Each investor decrypts only their own." />
            <SolutionCard delay={4} icon={<Activity className="w-5 h-5" />} title="FHE Cap Enforcement"
              body="FHE.le(newBalance, maxAllowed) enforces the 20% cap without revealing investor holdings." />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ HOW IT WORKS */}
      <section className="py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">Three steps to private ownership</h2>
          <p className="text-muted-foreground mt-3 text-sm">Click each step to explore</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-3">
            <StepCard n={1} icon={<Users className="w-4 h-4" />} title="Connect & Register"
              body="Connect your Ethereum wallet. Your address is logged on-chain with no personal data and no KYC. You receive a blank encrypted balance handle (euint64 = 0)."
              active={activeStep === 0} onClick={() => setActiveStep(0)} />
            <StepCard n={2} icon={<Lock className="w-4 h-4" />} title="Purchase Encrypted Shares"
              body="Buy shares by providing an FHE-encrypted purchase amount via the Zama relayer SDK. The contract runs FHE.add and FHE.le to validate the ownership cap without revealing any balance."
              active={activeStep === 1} onClick={() => setActiveStep(1)} />
            <StepCard n={3} icon={<TrendingUp className="w-4 h-4" />} title="Earn Private Dividends"
              body="When the owner distributes revenue, FHE.mul/div computes your proportional payout over encrypted data. You decrypt only your own payout using your wallet key."
              active={activeStep === 2} onClick={() => setActiveStep(2)} />
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl">
            <img
              src={[
                "https://images.unsplash.com/photo-1560185009-5bf9f2849488?w=800&q=80",
                "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
                "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
              ][activeStep]}
              alt="Step illustration"
              className="w-full h-80 object-cover transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 bg-card/80 backdrop-blur rounded-xl p-4 border border-border">
              <div className="text-xs font-mono text-primary mb-1">Step {activeStep + 1} / 3</div>
              <div className="font-mono text-sm font-bold">
                {["purchaseShares(einput, proof)", "FHE.add(balance, amount)", "FHE.mul(balance, revenue)"][activeStep]}
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-1">
                {["Encrypted amount submitted", "Balance updated with no plaintext", "Proportional payout computed encrypted"][activeStep]}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ PROPERTY SHOWCASE */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-4">
              <Building className="w-3.5 h-3.5" />
              The Asset
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Kampala Heights Apartments</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-border shadow-xl group">
              <img
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&q=80"
                alt="Kampala Heights Apartments aerial view"
                className="w-full h-80 lg:h-full object-cover group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-mono rounded-full font-bold">ACTIVE</span>
                <span className="text-white text-xs font-mono opacity-80">Fully Leased</span>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Asset Value", value: formatCurrency(property?.valueUsd ?? 0), color: "text-primary" },
                  { label: "Shares", value: formatNumber(property?.totalShares ?? 0), color: "text-foreground" },
                  { label: "Price / Share", value: `${property?.pricePerShare ?? 1} tUSDC`, color: "text-foreground" },
                  { label: "Max Ownership", value: "20%", color: "text-amber-600 dark:text-amber-400" },
                  { label: "On-Chain Investors", value: String(investorCount), color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Dividend Rounds", value: `${dividendRounds?.length ?? 0} Rounds`, color: "text-foreground" },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wide">{s.label}</div>
                    <div className={`font-bold font-mono ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-muted/60 border border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A premium mixed-use residential complex in Kampala's Nakasero district. 120 luxury units across 12 floors with panoramic views of Lake Victoria.
                </p>
              </div>

              <Link href="/listings/1">
                <Button variant="outline" className="w-full font-mono gap-2">
                  View Listing Details
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-blue-500/5" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto animate-pulse-glow">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight">
            Try the demo on Sepolia testnet
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Connect your wallet and buy encrypted shares on Sepolia. Get test tUSDC from the app sidebar after connecting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {address ? (
              <Link href="/explore">
                <Button size="lg" className="font-mono gap-2 shadow-lg hover:shadow-primary/25 hover:shadow-xl transition-shadow">
                  Explore Listings
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={() => void connect()} disabled={isConnecting} className="font-mono gap-2 shadow-lg hover:shadow-primary/25 hover:shadow-xl transition-shadow">
                {isConnecting ? "Connecting..." : "Connect Wallet"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            <Link href="/listings/1">
              <Button variant="outline" size="lg" className="font-mono gap-2 hover:border-primary/50">
                <Zap className="w-4 h-4" />
                Buy Shares
              </Button>
            </Link>
          </div>

          {walletError && !address && (
            <p className="text-sm font-mono text-destructive">{walletError}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-mono text-muted-foreground">
            {[
              { icon: <Lock className="w-3.5 h-3.5" />, label: "Zero plaintext on-chain" },
              { icon: <Shield className="w-3.5 h-3.5" />, label: "Encrypted on-chain" },
              { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "20% cap enforced cryptographically" },
            ].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-primary">{icon}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
