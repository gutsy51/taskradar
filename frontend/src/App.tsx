import "@/index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseAsBoolean, useQueryState } from "nuqs";
import { type ReactElement, useEffect } from "react";
import { useSnapshot } from "valtio";
import { Route, Switch, useLocation } from "wouter";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Authentication from "@/pages/authenticatuon";
import Analytics from "@/pages/analytics";
import Home from "@/pages/home";
import Sources from "@/pages/sources";
import TaskDetail from "@/pages/task-detail";
import Tasks from "@/pages/tasks";
import { application } from "@/states/application";
import { user } from "./lib/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
            name: data.username,
            email: data.email,
            staff: data.is_staff || false,
          };
        })
        .catch(() => {
          const token = localStorage.getItem("token");
          if (!token) setLocation("/users/authentication");
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
          <div className="flex-1 px-4">{children()}</div>
          {!tvMode && <SiteFooter />}
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
      <Switch>
        <Route path="/"           component={createLayout(Home)}       />
        <Route path="/tasks"      component={createLayout(Tasks)}      />
        <Route path="/tasks/:id"  component={createLayout(TaskDetail)} />
        <Route path="/sources"    component={createLayout(Sources)}    />
        <Route path="/analytics"  component={createLayout(Analytics)}  />
        <Route path="/users/authentication" component={Authentication} />
        <Route>
          <h3>Страница не найдена</h3>
        </Route>
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
