import { useSnapshot } from "valtio";
import { CreateMonitorDialog } from "@/dialogs/create-monitor";
import { CreatePanelDialog } from "@/dialogs/create-panel";
import { useCreateMonitor, useCreateProject } from "@/hooks/use-api";
import type { Monitor, Project } from "@/lib/types";
import { application } from "@/states/application";

export function AppDialogs() {
  const { creation } = useSnapshot(application);
  const createMonitorMutation = useCreateMonitor();
  const createProjectMutation = useCreateProject();

  return (
    <>
      <CreatePanelDialog
        open={creation.panel}
        onOpenChange={(open) => {
          application.creation.panel = open;
        }}
        onCreate={async (name) => {
          try {
            await createProjectMutation.mutateAsync({
              name,
              slug: name.toLowerCase().replace(/\s+/g, "-"),
              owners: [1],
            } as Partial<Project>);
          } catch (error) {
            console.error("Ошибка создания проекта:", error);
          }
        }}
      />

      <CreateMonitorDialog
        open={creation.monitor}
        onOpenChange={(open) => {
          application.creation.monitor = open;
        }}
        onCreate={async (values) => {
          try {
            const monitor = {
              name: values.name,
              type: values.type === "HTTP" ? "http" : "icmp",
              url: values.type === "HTTP" ? values.http.url : undefined,
              method: values.type === "HTTP" ? values.http.method : undefined,
              project: 1,
              enabled: true,
            } as Partial<Monitor>;

            await createMonitorMutation.mutateAsync(monitor);
          } catch (error) {
            console.error("Ошибка создания монитора:", error);
          }
        }}
      />
    </>
  );
}
