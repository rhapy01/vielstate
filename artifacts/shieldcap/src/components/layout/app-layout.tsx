import { useWallet } from "@/contexts/wallet-context";
import { useTheme } from "@/contexts/theme-context";
import { Link, useLocation } from "wouter";
import {
  Compass,
  Briefcase,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Coins,
  Settings,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { useIsContractOwner } from "@/hooks/use-is-contract-owner";
import { Button } from "@/components/ui/button";
import { TestTokenClaimPanel } from "@/components/test-token-claim-panel";
import { SepoliaNetworkBanner } from "@/components/sepolia-network-banner";
import { VielstateLogo } from "@/components/vielstate-logo";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/explore", label: "Explore", icon: Compass, shortLabel: "Explore" },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase, shortLabel: "Portfolio" },
  { href: "/market", label: "Secondary Market", icon: RefreshCw, shortLabel: "Market" },
];

function isNavActive(location: string, href: string) {
  return location === href || (href === "/explore" && location.startsWith("/listings"));
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { address, connect, disconnect, isConnecting, chainId, isSwitchingChain } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [showClaim, setShowClaim] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isOwner } = useIsContractOwner();

  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const navItems = isOwner
    ? [...NAV, { href: "/admin", label: "Admin", icon: Settings, shortLabel: "Admin" }]
    : NAV;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const networkLabel = isSwitchingChain
    ? "Switching..."
    : chainId === 11155111
      ? "Sepolia"
      : "Wrong network";

  const renderNavLinks = (onNavigate?: () => void) =>
    navItems.map(({ href, label, icon: Icon }) => {
      const active = isNavActive(location, href);
      return (
        <Link key={href} href={href}>
          <div
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-sm font-medium transition-all ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
            {active && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
          </div>
        </Link>
      );
    });

  const walletSection = (compact = false) => (
    <div className={`space-y-2 ${compact ? "" : ""}`}>
      {address ? (
        <>
          <div className="px-3 py-2 bg-muted rounded-md text-xs font-mono text-muted-foreground truncate">
            {address}
          </div>
          {showClaim ? (
            <TestTokenClaimPanel variant="compact" className="px-1" />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClaim(true)}
              className="w-full text-xs gap-1.5 font-mono"
            >
              <Coins className="w-3 h-3" />
              Claim ctUSDC
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={disconnect} className="w-full text-xs gap-1.5">
            <LogOut className="w-3 h-3" />
            Disconnect
          </Button>
        </>
      ) : (
        <Button onClick={() => void connect()} disabled={isConnecting} className="w-full font-mono text-xs gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 border-r border-border bg-sidebar flex-col shrink-0">
        <Link href="/">
          <div className="h-14 flex items-center px-5 border-b border-border cursor-pointer">
            <VielstateLogo className="h-8 w-auto max-w-[9rem] rounded-md shrink-0" />
          </div>
        </Link>

        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        <div className="p-3 border-t border-border">{walletSection()}</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Mobile + desktop header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="h-14 flex items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="lg:hidden w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-4 h-4" />
              </button>
              <Link href="/">
                <div className="flex items-center cursor-pointer min-w-0 lg:hidden">
                  <VielstateLogo className="h-8 w-auto max-w-[8rem] rounded-md shrink-0" />
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-muted-foreground">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${chainId === 11155111 ? "bg-primary" : "bg-amber-500"} animate-pulse`}
                />
                <span className="hidden sm:inline">{networkLabel}</span>
                <span className="sm:hidden">{chainId === 11155111 ? "SEP" : "!"}</span>
              </div>
              {address && (
                <span className="hidden md:inline text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded border border-border max-w-[120px] truncate">
                  {formatAddr(address)}
                </span>
              )}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile slide-over menu */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[min(100vw-3rem,20rem)] bg-sidebar border-r border-border flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
              <div className="h-14 flex items-center justify-between px-4 border-b border-border">
                <span className="font-mono font-bold text-sm">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
                {renderNavLinks(() => setMobileNavOpen(false))}
              </nav>
              <div className="p-3 border-t border-border">{walletSection()}</div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 space-y-4 sm:space-y-6">
          <SepoliaNetworkBanner />
          {children}
        </main>

        <footer className="hidden lg:block border-t border-border px-6 lg:px-8 py-4 bg-background">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
            <span>© 2026 Vielstate · Sepolia testnet</span>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/">
                <span className="hover:text-primary transition-colors cursor-pointer">Home</span>
              </Link>
              <Link href="/explore">
                <span className="hover:text-primary transition-colors cursor-pointer">Explore</span>
              </Link>
              <a
                href="https://docs.zama.ai/fhevm"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                Docs
              </a>
            </div>
          </div>
        </footer>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-pb">
          <div className="flex items-stretch justify-around px-1 py-1.5">
            {navItems.map(({ href, icon: Icon, shortLabel }) => {
              const active = isNavActive(location, href);
              return (
                <Link key={href} href={href}>
                  <div
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] px-2 py-1.5 rounded-md text-[10px] font-mono transition-colors ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate max-w-[5rem]">{shortLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
