import { useWallet } from "@/contexts/wallet-context";
import { useTheme } from "@/contexts/theme-context";
import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, Building, Briefcase, RefreshCw, Presentation, LogOut, Moon, Sun, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/property", label: "Property", icon: Building },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/market", label: "Market", icon: RefreshCw },
  { href: "/demo", label: "Demo", icon: Presentation },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { address, connect, disconnect } = useWallet();
  const { theme, toggleTheme } = useTheme();

  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col shrink-0">
        <Link href="/">
          <div className="h-14 flex items-center px-5 border-b border-border cursor-pointer">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center mr-2.5 shrink-0">
              <Shield className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-base tracking-tight">SHIELDCAP</span>
          </div>
        </Link>

        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          {address ? (
            <>
              <div className="px-3 py-2 bg-muted rounded-md text-xs font-mono text-muted-foreground truncate">
                {address}
              </div>
              <Button variant="outline" size="sm" onClick={disconnect} className="w-full text-xs gap-1.5">
                <LogOut className="w-3 h-3" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={connect} className="w-full font-mono text-xs gap-1.5">
              Connect Wallet
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Zama FHE Protocol Active — Balances encrypted on-chain
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Synced
            </div>
            {address && (
              <span className="hidden sm:block text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                {formatAddr(address)}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>

        {/* App footer */}
        <footer className="border-t border-border px-8 py-4 bg-background">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>© 2026 ShieldCap · Zama fhEVM</span>
            <div className="flex items-center gap-4">
              <Link href="/"><span className="hover:text-primary transition-colors cursor-pointer">Home</span></Link>
              <Link href="/demo"><span className="hover:text-primary transition-colors cursor-pointer">Demo</span></Link>
              <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Docs</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
