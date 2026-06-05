import { Link, useLocation } from "wouter";
import { Shield, Moon, Sun, Menu, X, Wallet } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useWallet } from "@/contexts/wallet-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { address, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const nav = [
    { href: "/", label: "Home" },
    { href: "/property", label: "Property" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/demo", label: "Demo" },
  ];

  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-mono font-bold text-lg tracking-tight">SHIELDCAP</span>
            </div>
          </Link>

          {/* Desktop nav */}
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
              <Button onClick={connect} size="sm" className="hidden sm:flex font-mono text-xs gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </Button>
            )}

            <button className="md:hidden" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
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
              <Button onClick={connect} size="sm" className="w-full mt-2 font-mono text-xs">
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Connect Wallet
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-mono font-bold tracking-tight">SHIELDCAP</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Confidential real-estate ownership powered by Zama Fully Homomorphic Encryption on-chain.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
              Zama fhEVM Active
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/property", label: "Property Details" },
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

          {/* Technology */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Technology</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/demo"><span className="cursor-pointer hover:text-primary transition-colors">Interactive Demo</span></Link></li>
              <li><a href="https://docs.zama.ai/fhevm" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Zama fhEVM</a></li>
              <li><a href="https://github.com/zama-ai/fhevm" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">FHEVM on GitHub</a></li>
              <li><a href="https://docs.zama.ai" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">FHE Documentation</a></li>
            </ul>
          </div>

          {/* Property */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Property</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Kampala Heights Apartments</li>
              <li>Kampala, Uganda</li>
              <li>50,000 Shares · $100/share</li>
              <li>20% Max Ownership Cap</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            © 2026 ShieldCap. Built on Zama fhEVM. All balances encrypted on-chain.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary" />
              Privacy-first by design
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
