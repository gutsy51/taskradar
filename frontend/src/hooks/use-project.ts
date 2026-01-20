import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMonitor,
  deleteProject,
  getChartReport,
  getIncidents,
  getMonitors,
  getProject,
  getSummaryReport,
} from "@/lib/client";
import type { Incident, Monitor, Project } from "@/lib/types";

// Хук для получения данных проекта
export function useProject(id: number) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}

// Хук для получения мониторов проекта
export function useProjectMonitors(projectId?: number) {
  return useQuery({
    queryKey: ["monitors", { projectId }],
    queryFn: async () => {
      const monitors = await getMonitors();
      return projectId
        ? monitors.filter((monitor: Monitor) => monitor.project === projectId)
        : monitors;
    },
    enabled: !!projectId,
  });
}

// Хук для получения инцидентов по мониторам проекта
export function useProjectIncidents(monitorIds: number[] = []) {
  return useQuery({
    queryKey: ["incidents", { monitorIds }],
    queryFn: async () => {
      const incidents = await getIncidents();
      return monitorIds.length > 0
        ? incidents.filter((incident: Incident) =>
            monitorIds.includes(incident.monitor),
          )
        : [];
    },
    enabled: monitorIds.length > 0,
  });
}

// Хук для получения отчетов
export function useProjectReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [chartReport, summaryReport] = await Promise.all([
        getChartReport(),
        getSummaryReport(),
      ]);
      return { chartReport, summaryReport };
    },
  });
}

// Хук для получения статуса мониторов
export function useMonitorStatuses(monitors: Monitor[] = []) {
  return useQuery({
    queryKey: ["monitor-statuses", monitors.map((m) => m.id)],
    queryFn: async () => {
      // Здесь можно добавить логику для получения статусов мониторов
      // Пока возвращаем мокированные данные
      return monitors.map((monitor) => ({
        id: monitor.id,
        status: Math.random() > 0.8 ? "down" : "up",
        uptime: Math.random() * 100,
        responseTime: Math.random() * 500 + 100,
        lastCheck: new Date(),
      }));
    },
    enabled: monitors.length > 0,
  });
}

// Хук для удаления монитора
export function useDeleteMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMonitor(id),
    onSuccess: () => {
      // Инвалидируем кэш мониторов после успешного удаления
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-statuses"] });
    },
  });
}

// Хук для удаления проекта
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      // Инвалидируем кэш проектов после успешного удаления
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}
