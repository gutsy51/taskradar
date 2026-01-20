import axios from "axios";
import type {
  AlertRule,
  Incident,
  ListUser,
  Monitor,
  PatchedAlertRule,
  PatchedMonitor,
  PatchedProject,
  Project,
  TokenObtainPair,
  TokenRefresh,
} from "./types";

const mock = true;

const client = axios.create({
  baseURL: "https://pingtower.nnstd.dev",
});

export async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  data?: any,
  token?: string,
): Promise<T> {
  if (mock) {
    // Моки для основных эндпоинтов
    switch (endpoint) {
      case "/api/users/me/":
        return Promise.resolve({
          id: 1,
          first_name: "Mock",
          last_name: "User",
          email: "mock@example.com",
          is_staff: true,
        } as T);
      case "/api/auth/jwt/create/":
        return Promise.resolve({
          access: "mock-access-token",
          refresh: "mock-refresh-token",
          email: data?.email,
          password: data?.password,
        } as T);
      case "/api/auth/jwt/refresh/":
        return Promise.resolve({
          access: "mock-access-token",
          refresh: data?.refresh,
        } as T);
      case "/api/monitors/":
        if (method === "GET") {
          return Promise.resolve([
            {
              id: 1,
              name: "Mock Monitor",
              type: "http",
              url: "https://example.com",
              method: "GET",
              project: 1,
              enabled: true,
            },
          ] as T);
        }
        if (method === "POST") {
          return Promise.resolve({ ...data, id: 2 } as T);
        }
        break;
      case `/api/monitors/${data?.id}/`:
        return Promise.resolve({ ...data } as T);
      case `/api/incidents/`:
        if (method === "GET") {
          return Promise.resolve([
            {
              id: 1,
              opened_at: new Date().toISOString(),
              closed_at: null,
              reason: "Mock incident",
              active: true,
              monitor: 1,
            },
          ] as T);
        }
        break;
      case `/api/projects/`:
        if (method === "GET") {
          return Promise.resolve([
            {
              id: 1,
              name: "Mock Project",
              slug: "mock-project",
              owners: [1],
            },
          ] as T);
        }
        if (method === "POST") {
          return Promise.resolve({ ...data, id: 2 } as T);
        }
        break;
      case `/api/rules/`:
        if (method === "GET") {
          return Promise.resolve([
            {
              id: 1,
              name: "Mock Rule",
              trigger_on_failure: true,
              min_consecutive: 1,
              notify_channels: {},
              group_window_sec: 60,
              monitor: 1,
            },
          ] as T);
        }
        if (method === "POST") {
          return Promise.resolve({ ...data, id: 2 } as T);
        }
        break;
      case `/api/reports/chart/`:
      case `/api/reports/sla/`:
      case `/api/reports/summary/`:
        return Promise.resolve({} as T);
      default:
        // Для /api/users/list/ и других списков
        if (endpoint.startsWith("/api/users/list/")) {
          return Promise.resolve([
            {
              id: 1,
              email: "mock@example.com",
              first_name: "Mock",
              last_name: "User",
              is_active: true,
              is_staff: true,
              last_login: new Date(),
              date_joined: new Date(),
            },
            {
              id: 2,
              email: "test@example.com",
              first_name: "Test",
              last_name: "User",
              is_active: true,
              is_staff: false,
              last_login: new Date(),
              date_joined: new Date(),
            },
          ] as T);
        }
        // Для остальных возвращаем пустой объект
        return Promise.resolve({} as T);
    }
  }
  const headers: Record<string, string> = {};
  let authToken = token;
  if (!authToken && typeof window !== "undefined") {
    authToken = localStorage.getItem("token") || undefined;
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await client.request<T>({
    url: endpoint,
    method,
    data,
    headers,
  });
  return response.data;
}

// AUTH
export function login(data: TokenObtainPair) {
  return apiRequest<TokenObtainPair>("/api/auth/jwt/create/", "POST", data);
}
export function refreshToken(data: TokenRefresh) {
  return apiRequest<TokenRefresh>("/api/auth/jwt/refresh/", "POST", data);
}

// USERS

export function user() {
  return apiRequest<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_staff: boolean;
  }>("/api/users/me/", "GET");
}

export function usersList(search?: string) {
  return apiRequest<ListUser[]>(
    "/api/users/list/" + (search ? `?search=${search}` : ""),
    "GET",
  );
}

// MONITORS

export function getMonitors(token?: string) {
  return apiRequest<Monitor[]>("/api/monitors/", "GET", undefined, token);
}
export function createMonitor(data: Partial<Monitor>, token?: string) {
  return apiRequest<Monitor>("/api/monitors/", "POST", data, token);
}
export function getMonitor(id: number, token?: string) {
  return apiRequest<Monitor>(`/api/monitors/${id}/`, "GET", undefined, token);
}
export function updateMonitor(id: number, data: Monitor, token?: string) {
  return apiRequest<Monitor>(`/api/monitors/${id}/`, "PUT", data, token);
}
export function patchMonitor(id: number, data: PatchedMonitor, token?: string) {
  return apiRequest<Monitor>(`/api/monitors/${id}/`, "PATCH", data, token);
}
export function deleteMonitor(id: number, token?: string) {
  return apiRequest<void>(`/api/monitors/${id}/`, "DELETE", undefined, token);
}
export function runMonitorNow(id: number, data: Monitor, token?: string) {
  return apiRequest<Monitor>(
    `/api/monitors/${id}/run_now/`,
    "POST",
    data,
    token,
  );
}
export function getMonitorState(id: number, token?: string) {
  return apiRequest<Monitor>(
    `/api/monitors/${id}/state/`,
    "GET",
    undefined,
    token,
  );
}
export function getMonitorTimeseries(id: number, token?: string) {
  return apiRequest<Monitor>(
    `/api/monitors/${id}/timeseries/`,
    "GET",
    undefined,
    token,
  );
}
export function getMonitorUptime(id: number, token?: string) {
  return apiRequest<Monitor>(
    `/api/monitors/${id}/uptime/`,
    "GET",
    undefined,
    token,
  );
}

// INCIDENTS
export function getIncidents(token?: string) {
  return apiRequest<Incident[]>("/api/incidents/", "GET", undefined, token);
}
export function getIncident(id: number, token?: string) {
  return apiRequest<Incident>(`/api/incidents/${id}/`, "GET", undefined, token);
}

// PROJECTS
export function getProjects(token?: string) {
  return apiRequest<Project[]>("/api/projects/", "GET", undefined, token);
}
export function createProject(data: Partial<Project>, token?: string) {
  return apiRequest<Project>("/api/projects/", "POST", data, token);
}
export function getProject(id: number, token?: string) {
  return apiRequest<Project>(`/api/projects/${id}/`, "GET", undefined, token);
}
export function updateProject(id: number, data: Project, token?: string) {
  return apiRequest<Project>(`/api/projects/${id}/`, "PUT", data, token);
}
export function patchProject(id: number, data: PatchedProject, token?: string) {
  return apiRequest<Project>(`/api/projects/${id}/`, "PATCH", data, token);
}
export function deleteProject(id: number, token?: string) {
  return apiRequest<void>(`/api/projects/${id}/`, "DELETE", undefined, token);
}

// ALERT RULES
export function getAlertRules(token?: string) {
  return apiRequest<AlertRule[]>("/api/rules/", "GET", undefined, token);
}
export function createAlertRule(data: AlertRule, token?: string) {
  return apiRequest<AlertRule>("/api/rules/", "POST", data, token);
}
export function getAlertRule(id: number, token?: string) {
  return apiRequest<AlertRule>(`/api/rules/${id}/`, "GET", undefined, token);
}
export function updateAlertRule(id: number, data: AlertRule, token?: string) {
  return apiRequest<AlertRule>(`/api/rules/${id}/`, "PUT", data, token);
}
export function patchAlertRule(
  id: number,
  data: PatchedAlertRule,
  token?: string,
) {
  return apiRequest<AlertRule>(`/api/rules/${id}/`, "PATCH", data, token);
}
export function deleteAlertRule(id: number, token?: string) {
  return apiRequest<void>(`/api/rules/${id}/`, "DELETE", undefined, token);
}

// REPORTS
export function getChartReport(token?: string) {
  return apiRequest<any>("/api/reports/chart/", "GET", undefined, token);
}
export function getSlaReport(token?: string) {
  return apiRequest<any>("/api/reports/sla/", "GET", undefined, token);
}
export function getSummaryReport(token?: string) {
  return apiRequest<any>("/api/reports/summary/", "GET", undefined, token);
}
