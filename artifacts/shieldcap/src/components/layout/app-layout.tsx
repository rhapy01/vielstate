import { useWallet } from "@/contexts/wallet-context";
import { Link, useLocation } from "wouter";
import { Shield, Home, Building, Briefcase, RefreshCw, Presentation, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { address, connect, disconnect } = useWallet();

  const nav = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/property", label: "Property", icon: Building },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/market", label: "Market", icon: RefreshCw },
    { href: "/demo", label: "Demo", icon: Presentation },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background dark text-foreground">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Shield className="w-6 h-6 text-primary mr-2" />
          <span className="font-mono font-bold text-lg tracking-tight">SHIELDCAP</span>
        </div>
        
        <div className="flex-1 py-6 flex flex-col gap-1 px-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={`w-full justify-start font-mono text-sm ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          {address ? (
            <div className="flex flex-col gap-2">
              <div className="px-3 py-2 bg-secondary rounded-md text-xs font-mono text-muted-foreground truncate">
                {address}
              </div>
              <Button variant="outline" size="sm" onClick={disconnect} className="w-full text-xs">
                <LogOut className="w-3 h-3 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connect} className="w-full font-mono text-sm">
              Connect Wallet
            </Button>
          )}
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur">
          <div className="flex items-center text-xs font-mono text-muted-foreground">
            <Shield className="w-4 h-4 mr-2 text-primary/70" />
            Zama FHE Protocol Active — All sensitive data is encrypted on-chain
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Mainnet Synced
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
