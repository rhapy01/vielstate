import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/wallet-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppLayout } from "@/components/layout/app-layout";
import { PublicLayout } from "@/components/layout/public-layout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Property from "@/pages/property";
import Portfolio from "@/pages/portfolio";
import Market from "@/pages/market";
import Demo from "@/pages/demo";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public pages — navbar + footer */}
      <Route path="/">
        <PublicLayout>
          <Landing />
        </PublicLayout>
      </Route>

      {/* App pages — sidebar layout */}
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/property">
        <AppLayout><Property /></AppLayout>
      </Route>
      <Route path="/portfolio">
        <AppLayout><Portfolio /></AppLayout>
      </Route>
      <Route path="/market">
        <AppLayout><Market /></AppLayout>
      </Route>
      <Route path="/demo">
        <AppLayout><Demo /></AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WalletProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </WalletProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
