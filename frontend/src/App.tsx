import "@/index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseAsBoolean, useQueryState } from "nuqs";
import { type ReactElement, useEffect } from "react";
import { useSnapshot } from "valtio";
import { Route, Switch, useLocation } from "wouter";
import { AppDialogs } from "@/components/app-dialogs";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Authentication from "@/pages/authenticatuon";
import Home from "@/pages/home";
import Panel from "@/pages/panel";
import Panels from "@/pages/panels";
import Users from "@/pages/users";
import { application } from "@/states/application";
import { user } from "./lib/client";

// Создаем QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function createLayout(children: () => ReactElement) {
  const [, setLocation] = useLocation();

  const { tvMode } = useSnapshot(application);

  return () => {
    useEffect(() => {
      user()
        .then((data) => {
          application.user = {
            name: [data.first_name, data.last_name].filter(Boolean).join(" "),
            email: data.email,
            staff: data.is_staff || false,
          };
        })
        .catch(() => {
          setLocation("/users/authentication");
        });
    }, []);

    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        {!tvMode && <AppSidebar variant="inset" />}

        <SidebarInset>
          {!tvMode && <SiteHeader />}

          <div className="px-4">{children()}</div>

          <AppDialogs />
        </SidebarInset>
      </SidebarProvider>
    );
  };
}

export function App() {
  const [tvMode] = useQueryState("tv", parseAsBoolean.withDefault(false));

  useEffect(() => {
    application.tvMode = tvMode;
  }, [tvMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <>
        <Switch>
          <Route path="/" component={createLayout(Home)} />

          <Route path="/users" component={createLayout(Users)} />

          <Route path="/panels" component={createLayout(Panels)} />
          <Route path="/panels/:id" component={createLayout(Panel)} />

          <Route path="/users/authentication" component={Authentication} />

          <Route>
            <h3>Страница не найдена</h3>
          </Route>
        </Switch>

        <Toaster />
      </>
    </QueryClientProvider>
  );
}

export default App;
