import { Link, useLocation } from "wouter";
import { Shield, Moon, Sun, Menu, X, Wallet } from "lucide-react";
import { VielstateLogo } from "@/components/vielstate-logo";
import { useTheme } from "@/contexts/theme-context";
import { useWallet } from "@/contexts/wallet-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SepoliaNetworkBanner } from "@/components/sepolia-network-banner";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { address, connect, disconnect, isConnecting, error: walletError } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const nav = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/market", label: "Secondary Market" },
  ];

  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <VielstateLogo className="h-9 w-auto max-w-[10rem] rounded-md" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {nav.map(item => (
              <Link key={item.href} href={item.href}>
                <span className={`text-sm font-medium cursor-pointer transition-colors hover:text-primary ${location === item.href ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {address ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border">
                  {formatAddr(address)}
                </span>
                <Button variant="outline" size="sm" onClick={disconnect} className="text-xs">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={() => void connect()} disabled={isConnecting} size="sm" className="hidden sm:flex font-mono text-xs gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}

            <button className="md:hidden" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {walletError && !address && (
          <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 text-xs font-mono text-destructive">
            {walletError}
          </p>
        )}

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
            {nav.map(item => (
              <Link key={item.href} href={item.href}>
                <span
                  className={`block text-sm font-medium cursor-pointer py-1 ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            {address ? (
              <Button variant="outline" size="sm" onClick={disconnect} className="w-full text-xs mt-2">
                Disconnect {formatAddr(address)}
              </Button>
            ) : (
              <Button onClick={() => void connect()} disabled={isConnecting} size="sm" className="w-full mt-2 font-mono text-xs">
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <SepoliaNetworkBanner />
        </div>
        {children}
      </main>

      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1 space-y-4">
            <VielstateLogo className="h-8 w-auto max-w-[9rem] rounded-md" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fractional real estate investing — buy shares, earn income, trade on the marketplace, and manage your portfolio. Confidential positions powered by Zama.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
              Sepolia testnet demo
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: "/explore", label: "Explore Listings" },
                { href: "/listings/1", label: "Kampala Heights" },
                { href: "/portfolio", label: "My Portfolio" },
                { href: "/market", label: "Secondary Market" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="cursor-pointer hover:text-primary transition-colors">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Learn</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore"><span className="cursor-pointer hover:text-primary transition-colors">How to buy shares</span></Link></li>
              <li><Link href="/portfolio"><span className="cursor-pointer hover:text-primary transition-colors">View your portfolio</span></Link></li>
              <li><Link href="/market"><span className="cursor-pointer hover:text-primary transition-colors">Sell your shares</span></Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Demo listing</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Kampala Heights Apartments</li>
              <li>Kampala, Uganda</li>
              <li>50,000 shares · 1 tUSDC each</li>
              <li>20% Max Ownership Cap</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            © 2026 Vielstate. Testnet preview on Sepolia only.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary" />
              Confidential investing by Zama
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
