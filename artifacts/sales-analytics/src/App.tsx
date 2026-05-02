import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { I18nProvider } from "@/i18n";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/tickets/[id]";
import Users from "@/pages/users";
import Hierarchy from "@/pages/hierarchy";
import Mapping from "@/pages/mapping";
import Sync from "@/pages/sync";
import Settings from "@/pages/settings";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const token = useAuth((s) => s.token);
  if (!token) return <Redirect to="/login" />;
  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/tickets"><ProtectedRoute component={Tickets} /></Route>
      <Route path="/tickets/:id"><ProtectedRoute component={TicketDetail} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/hierarchy"><ProtectedRoute component={Hierarchy} /></Route>
      <Route path="/mapping"><ProtectedRoute component={Mapping} /></Route>
      <Route path="/sync"><ProtectedRoute component={Sync} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route>
        <Layout>
          <div className="flex h-full items-center justify-center">
            <h1 className="text-2xl font-bold text-muted-foreground">404 - Not Found</h1>
          </div>
        </Layout>
      </Route>
    </Switch>
  );
}

setAuthTokenGetter(() => localStorage.getItem("token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
