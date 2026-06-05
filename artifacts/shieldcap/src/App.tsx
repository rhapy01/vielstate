import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/wallet-context";
import { AppLayout } from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Property from "@/pages/property";
import Portfolio from "@/pages/portfolio";
import Market from "@/pages/market";
import Demo from "@/pages/demo";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/property" component={Property} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/market" component={Market} />
        <Route path="/demo" component={Demo} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
