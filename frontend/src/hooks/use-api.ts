import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMonitor,
  createProject,
  deleteMonitor,
  deleteProject,
  getIncidents,
  getMonitors,
  getProjects,
  updateMonitor,
  updateProject,
  usersList,
} from "@/lib/client";
import type { ListUser, Monitor, Project } from "@/lib/types";

// Query keys
export const QUERY_KEYS = {
  monitors: ["monitors"] as const,
  projects: ["projects"] as const,
  incidents: ["incidents"] as const,
  users: ["users"] as const,
  monitor: (id: number) => ["monitors", id] as const,
  project: (id: number) => ["projects", id] as const,
  incident: (id: number) => ["incidents", id] as const,
  usersSearch: (search?: string) => ["users", "search", search] as const,
} as const;

// Мониторы
export function useMonitors() {
  return useQuery({
    queryKey: QUERY_KEYS.monitors,
    queryFn: () => getMonitors(),
    staleTime: 30 * 1000, // 30 секунд
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monitor: Partial<Monitor>) => createMonitor(monitor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitors });
    },
  });
}

export function useUpdateMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Monitor }) =>
      updateMonitor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitors });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMonitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitors });
    },
  });
}

// Проекты
export function useProjects() {
  return useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: () => getProjects(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: Partial<Project>) => createProject(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Project }) =>
      updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// Инциденты
export function useIncidents() {
  return useQuery({
    queryKey: QUERY_KEYS.incidents,
    queryFn: () => getIncidents(),
    staleTime: 60 * 1000, // 1 минута
  });
}

// Пользователи
export function useUsers(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.usersSearch(search),
    queryFn: () => usersList(search),
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
}

// Комбинированный хук для панели мониторинга
export function useDashboardData() {
  const monitors = useMonitors();
  const projects = useProjects();
  const incidents = useIncidents();
  const users = useUsers();

  return {
    monitors,
    projects,
    incidents,
    users,
    isLoading:
      monitors.isLoading ||
      projects.isLoading ||
      incidents.isLoading ||
      users.isLoading,
    isError:
      monitors.isError ||
      projects.isError ||
      incidents.isError ||
      users.isError,
    error: monitors.error || projects.error || incidents.error || users.error,
    refetch: () => {
      monitors.refetch();
      projects.refetch();
      incidents.refetch();
      users.refetch();
    },
  };
}

// Хук для получения статистики домашней страницы
export function useHomeStats() {
  const monitors = useMonitors();
  const users = useUsers();
  const incidents = useIncidents();
  const projects = useProjects();

  const stats = {
    totalMonitors: monitors.data?.length || 0,
    activeMonitors: monitors.data?.filter((m) => m.enabled)?.length || 0,
    totalUsers: users.data?.length || 0,
    activeUsers: users.data?.filter((u) => u.is_active)?.length || 0,
    totalIncidents: incidents.data?.length || 0,
    activeIncidents: incidents.data?.filter((i) => i.active)?.length || 0,
    totalProjects: projects.data?.length || 0,
  };

  return {
    stats,
    isLoading:
      monitors.isLoading ||
      users.isLoading ||
      incidents.isLoading ||
      projects.isLoading,
    isError:
      monitors.isError ||
      users.isError ||
      incidents.isError ||
      projects.isError,
    error: monitors.error || users.error || incidents.error || projects.error,
    refetch: () => {
      monitors.refetch();
      users.refetch();
      incidents.refetch();
      projects.refetch();
    },
  };
}
