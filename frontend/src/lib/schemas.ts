import { z } from "zod";

// Схема для монитора
export const monitorSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["http"]),
  url: z.string().url(),
  method: z.string(),
  headers: z.record(z.string(), z.any()).optional(),
  body: z.string().optional(),
  timeout_ms: z.number().optional(),
  verify_ssl: z.boolean().optional(),
  expected_status: z.any().optional(),
  expect_substring: z.string().optional(),
  expect_jsonpath: z.string().optional(),
  rt_threshold_ms: z.number().nullable().optional(),
  ssl_min_days: z.number().nullable().optional(),
  interval_sec: z.number().optional(),
  cron: z.string().optional(),
  enabled: z.boolean().optional(),
  tags: z.record(z.string(), z.any()).optional(),
  project: z.number(),
  created_by: z.number().nullable().optional(),
});

// Схема для проекта
export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  owners: z.array(z.number()),
});

// Схема для инцидента
export const incidentSchema = z.object({
  id: z.number(),
  opened_at: z.string(),
  closed_at: z.string().nullable().optional(),
  reason: z.string().optional(),
  active: z.boolean().optional(),
  monitor: z.number(),
});

// Схема для статуса монитора
export const monitorStatusSchema = z.object({
  id: z.number(),
  status: z.enum(["up", "down", "unknown"]),
  uptime: z.number(),
  responseTime: z.number(),
  lastCheck: z.string(),
});

// Схема для пользователя
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  is_staff: z.boolean(),
  last_login: z.string().nullable(),
  date_joined: z.string(),
});

// Схема для поиска пользователей
export const userSearchSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["all", "staff", "active", "inactive"]).default("all"),
  sort: z.enum(["name", "email", "date_joined", "last_login"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// Типы, выведенные из схем
export type MonitorInput = z.infer<typeof monitorSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type IncidentInput = z.infer<typeof incidentSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type UserSearchInput = z.infer<typeof userSearchSchema>;
