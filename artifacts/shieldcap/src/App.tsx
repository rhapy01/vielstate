import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/wallet-context";
import { FhevmProvider } from "@/contexts/fhevm-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppLayout } from "@/components/layout/app-layout";
import { PublicLayout } from "@/components/layout/public-layout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Explore from "@/pages/explore";
import ListingDetail from "@/pages/listing-detail";
import Portfolio from "@/pages/portfolio";
import Market from "@/pages/market";
import Admin from "@/pages/admin";
import LegacyRedirect from "@/pages/legacy-redirect";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicLayout>
          <Landing />
        </PublicLayout>
      </Route>

      <Route path="/explore">
        <AppLayout><Explore /></AppLayout>
      </Route>
      <Route path="/listings/:id">
        <AppLayout><ListingDetail /></AppLayout>
      </Route>
      <Route path="/portfolio">
        <AppLayout><Portfolio /></AppLayout>
      </Route>
      <Route path="/market">
        <AppLayout><Market /></AppLayout>
      </Route>
      <Route path="/admin">
        <AppLayout><Admin /></AppLayout>
      </Route>

      {/* Legacy routes */}
      <Route path="/dashboard"><AppLayout><LegacyRedirect to="/explore" /></AppLayout></Route>
      <Route path="/purchase"><AppLayout><LegacyRedirect to="/explore" /></AppLayout></Route>
      <Route path="/property"><AppLayout><LegacyRedirect to="/listings/1" /></AppLayout></Route>

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
            <FhevmProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </FhevmProvider>
          </WalletProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
