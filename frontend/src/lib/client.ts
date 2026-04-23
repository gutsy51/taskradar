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
  SearchResult,
  SourceStats,
  Task,
  TokenObtainPair,
  TokenRefresh,
} from "./types";

const MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: "Разработка интернет-магазина на Vue.js + Laravel",
    description: "Требуется разработать интернет-магазин с каталогом товаров, корзиной, онлайн-оплатой и личным кабинетом. Дизайн-макет в Figma готов. Обязательна интеграция с 1С и транспортными компаниями.",
    price_currency: "RUB",
    url: "https://fl.ru/projects/12345/",
    source: "fl.ru",
    source_base_url: "https://fl.ru",
    collected_at: "2026-04-13 10:00:00",
    price: 85000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 2,
    title: "Парсер данных с Wildberries и Ozon",
    description: "Нужен парсер для сбора цен и остатков с маркетплейсов. Python, Selenium или API. Запуск по расписанию раз в 3 часа, выгрузка в Google Sheets и PostgreSQL.",
    price_currency: "RUB",
    url: "https://www.freelancejob.ru/projects/234567/",
    source: "freelancejob.ru",
    source_base_url: "https://www.freelancejob.ru",
    collected_at: "2026-04-13 09:45:00",
    price: 12000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 3,
    title: "Верстка лендинга по макету Figma",
    description: "Готов макет в Figma, нужна верстка на HTML/CSS (Bootstrap или Tailwind). Адаптив под мобильные. Анимации по скроллу. Срок — 3 дня.",
    price_currency: "RUB",
    url: "https://freelance.ru/project/345678/",
    source: "freelance.ru",
    source_base_url: "https://freelance.ru",
    collected_at: "2026-04-13 09:30:00",
    price: 5000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 4,
    title: "Настройка VPS Ubuntu: Nginx, Docker, SSL",
    description: "Требуется настроить VPS с Ubuntu 22.04: установка Nginx, Docker Compose, настройка Let's Encrypt. Развернуть 2 приложения в контейнерах.",
    price_currency: "RUB",
    url: "https://www.weblancer.net/projects/456789/",
    source: "weblancer.net",
    source_base_url: "https://www.weblancer.net",
    collected_at: "2026-04-13 09:15:00",
    price: 0,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 5,
    title: "SEO-текст для главной страницы автосервиса",
    description: "Написать SEO-оптимизированный текст на 2000 знаков для главной страницы автосервиса в Москве. Ключи предоставлю. Уникальность от 95%.",
    price_currency: "RUB",
    url: "https://client.work-zilla.com/freelancer/567890?from=detail",
    source: "workzilla.com",
    source_base_url: "https://client.work-zilla.com",
    collected_at: "2026-04-13 09:00:00",
    price: 800,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 6,
    title: "Мобильное приложение на Flutter (iOS + Android)",
    description: "Нужно приложение для доставки еды: каталог, корзина, оплата, трекинг курьера на карте. Дизайн в Figma есть. Бэкенд на Django REST Framework.",
    price_currency: "RUB",
    url: "https://fl.ru/projects/12346/",
    source: "fl.ru",
    source_base_url: "https://fl.ru",
    collected_at: "2026-04-13 08:45:00",
    price: 150000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 7,
    title: "Telegram-бот для записи клиентов в салон",
    description: "Бот для красоты-салона: запись к мастеру, выбор услуги и времени, напоминания за 2 часа, интеграция с Google Calendar. Python, aiogram.",
    price_currency: "RUB",
    url: "https://www.freelancejob.ru/projects/234568/",
    source: "freelancejob.ru",
    source_base_url: "https://www.freelancejob.ru",
    collected_at: "2026-04-13 08:30:00",
    price: 18000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 8,
    title: "Дизайн логотипа и фирменного стиля",
    description: "Разработка логотипа + гайдлайн для IT-стартапа. Нужны 3 концепции, исходники в AI и PDF. Тематика — облачное хранилище данных.",
    price_currency: "RUB",
    url: "https://freelance.ru/project/345679/",
    source: "freelance.ru",
    source_base_url: "https://freelance.ru",
    collected_at: "2026-04-13 08:15:00",
    price: 0,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 9,
    title: "Наполнение интернет-магазина товарами",
    description: "Загрузить 500 карточек товаров в OpenCart: название, описание, фото, характеристики. Данные в Excel, фото на Google Drive. Срок — 5 дней.",
    price_currency: "RUB",
    url: "https://client.work-zilla.com/freelancer/567891?from=detail",
    source: "workzilla.com",
    source_base_url: "https://client.work-zilla.com",
    collected_at: "2026-04-13 08:00:00",
    price: 3500,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 10,
    title: "Настройка CI/CD на GitHub Actions для Django",
    description: "Нужно настроить CI/CD: автотесты pytest, линтер, сборка Docker-образа и деплой на VPS при пуше в main. Проект на Django + PostgreSQL.",
    price_currency: "RUB",
    url: "https://www.weblancer.net/projects/456790/",
    source: "weblancer.net",
    source_base_url: "https://www.weblancer.net",
    collected_at: "2026-04-13 07:45:00",
    price: null,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 11,
    title: "React-дашборд для аналитики продаж",
    description: "Дашборд с графиками продаж, фильтрами по периоду и категориям, экспортом в PDF. Данные через REST API (документация есть). Recharts или Victory.",
    price_currency: "RUB",
    url: "https://fl.ru/projects/12347/",
    source: "fl.ru",
    source_base_url: "https://fl.ru",
    collected_at: "2026-04-13 07:30:00",
    price: 45000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
  {
    id: 12,
    title: "Перевод сайта с WordPress на Next.js",
    description: "Перенести существующий сайт (50+ страниц) с WordPress на Next.js 14 + headless CMS (Strapi или Contentful). SSR, оптимизация Core Web Vitals.",
    price_currency: "RUB",
    url: "https://www.freelancejob.ru/projects/234569/",
    source: "freelancejob.ru",
    source_base_url: "https://www.freelancejob.ru",
    collected_at: "2026-04-13 07:15:00",
    price: 65000,
    is_deleted: false,
    published_at: null,
    cleaned_text: "",
    similarity: null,
  },
];

const MOCK_SOURCE_STATS: SourceStats[] = [
  { source: "fl.ru",           total: 2341, new_today: 47, last_parsed: "2026-04-13 10:00:00" },
  { source: "freelancejob.ru", total: 1823, new_today: 31, last_parsed: "2026-04-13 09:45:00" },
  { source: "freelance.ru",    total: 1245, new_today: 22, last_parsed: "2026-04-13 09:30:00" },
  { source: "weblancer.net",   total: 3123, new_today: 58, last_parsed: "2026-04-13 10:05:00" },
  { source: "workzilla.com",   total:  873, new_today: 15, last_parsed: "2026-04-13 09:15:00" },
];

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
      case "/api/tasks/":
        return Promise.resolve(MOCK_TASKS as T);
      case "/api/tasks/sources/":
        return Promise.resolve(MOCK_SOURCE_STATS as T);
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
    headers.Authorization = `Bearer ${authToken}`;
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

// TASKS
export function getTasks() {
  return apiRequest<Task[]>("/api/tasks/", "GET");
}
export function getSourceStats() {
  return apiRequest<SourceStats[]>("/api/tasks/sources/", "GET");
}

// TASKRADAR BACKEND API
const backendClient = axios.create({
  baseURL: "http://localhost:8000",
});

export interface SearchTasksPayload {
  query?: string;
  source?: string[];
  price_is_specified?: boolean;
  price_min?: number;
  price_max?: number;
  limit?: number;
  offset?: number;
}

export async function searchTasksAPI(payload: SearchTasksPayload): Promise<SearchResult> {
  const response = await backendClient.post<{ ok: boolean; data: SearchResult }>("/rest/v1/search/", payload);
  return response.data.data;
}

export async function getSourceStatsAPI(): Promise<SourceStats[]> {
  const response = await backendClient.get<SourceStats[]>("/rest/v1/sources/");
  return response.data;
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
