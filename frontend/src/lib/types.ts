// Типы, соответствующие схемам OpenAPI
export type TypeEnum = "http" | "icmp";

export interface TokenObtainPair {
  email: string;
  password: string;
  access?: string;
  refresh?: string;
}

export interface TokenRefresh {
  refresh: string;
  access?: string;
}

export interface ListUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  last_login: Date;
  date_joined: Date;
}

export interface Monitor {
  id: number;
  name: string;
  type: TypeEnum;
  url: string;
  method: string;
  headers?: Record<string, any>;
  body?: string;
  timeout_ms?: number;
  verify_ssl?: boolean;
  expected_status?: any;
  expect_substring?: string;
  expect_jsonpath?: string;
  rt_threshold_ms?: number | null;
  ssl_min_days?: number | null;
  interval_sec?: number;
  cron?: string;
  enabled?: boolean;
  tags?: Record<string, any>;
  project: number;
  created_by?: number | null;
}

export interface PatchedMonitor extends Partial<Monitor> {
  id?: number;
}

export interface Incident {
  id: number;
  opened_at: string;
  closed_at?: string | null;
  reason?: string;
  active?: boolean;
  monitor: number;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  owners: number[];
}

export interface PatchedProject extends Partial<Project> {
  id?: number;
}

export interface AlertRule {
  id: number;
  name: string;
  trigger_on_failure?: boolean;
  min_consecutive?: number;
  notify_channels?: Record<string, any>;
  group_window_sec?: number;
  monitor: number;
}

export interface PatchedAlertRule extends Partial<AlertRule> {
  id?: number;
}
