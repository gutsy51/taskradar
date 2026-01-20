import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconGlobe,
  IconRefresh,
  IconSearch,
  IconShield,
  IconTrendingUp,
  IconWifi,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/use-api";
import type { Monitor } from "@/lib/types";
import { cn } from "@/lib/utils";

// Компонент для отображения последних статусов монитора
function LastStatuses({ monitorId }: { monitorId: number }) {
  // Генерируем случайные статусы для демонстрации
  const statuses = [
    true,
    true,
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    true,
  ];

  return (
    <div className="flex flex-row gap-0.5">
      {statuses.slice(0, 10).map((status, index) => (
        <div
          key={`status-${monitorId}-${index}`}
          className={cn(
            "w-1.5 h-4 rounded-sm hover:w-2 transition-all cursor-pointer",
            status ? "bg-green-400" : "bg-red-400",
          )}
          title={status ? "Успешно" : "Ошибка"}
        />
      ))}
    </div>
  );
}

export default function Panels() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [, setLocation] = useLocation();

  // Используем кастомный хук для получения данных
  const { monitors, projects, incidents, isLoading, refetch } =
    useDashboardData();

  // Получаем данные из queries
  const monitorsData = monitors.data || [];
  const projectsData = projects.data || [];
  const incidentsData = incidents.data || [];

  const stats = useMemo(
    () => ({
      totalMonitors: monitorsData.length,
      activeIncidents: incidentsData.filter((i) => i.active).length,
      healthyMonitors: monitorsData.filter((m) => m.enabled).length,
      projects: projectsData.length,
      warningMonitors: monitorsData.filter((m) => !m.enabled).length,
      uptime:
        monitorsData.length > 0
          ? (monitorsData.filter((m) => m.enabled).length /
              monitorsData.length) *
            100
          : 0,
    }),
    [monitorsData, projectsData, incidentsData],
  );

  const getMonitorStatus = (
    monitor: Monitor,
  ): "healthy" | "warning" | "error" => {
    const activeIncident = incidentsData.find(
      (i) => i.monitor === monitor.id && i.active,
    );
    if (activeIncident) return "error";
    if (!monitor.enabled) return "warning";
    return "healthy";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "healthy":
        return "Работает";
      case "warning":
        return "Отключен";
      case "error":
        return "Ошибка";
      default:
        return "Неизвестно";
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Фильтрация мониторов
  const filteredMonitors = useMemo(() => {
    return monitorsData.filter((monitor) => {
      const project = projectsData.find((p) => p.id === monitor.project);
      const status = getMonitorStatus(monitor);

      const matchesSearch =
        monitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        monitor.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProject =
        selectedProject === "all" ||
        monitor.project.toString() === selectedProject;
      const matchesStatus =
        selectedStatus === "all" || status === selectedStatus;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [
    monitorsData,
    projectsData,
    searchTerm,
    selectedProject,
    selectedStatus,
    getMonitorStatus,
  ]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Панели мониторинга
          </h1>
          <p className="text-muted-foreground">
            Обзор всех мониторов и их состояния
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={
            monitors.isFetching || projects.isFetching || incidents.isFetching
          }
          variant="outline"
        >
          <IconRefresh
            className={`mr-2 h-4 w-4 ${monitors.isFetching || projects.isFetching || incidents.isFetching ? "animate-spin" : ""}`}
          />
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconActivity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Всего мониторов
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.totalMonitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Активных
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.healthyMonitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconAlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Отключено
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.warningMonitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconAlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Активных инцидентов
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.activeIncidents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Время работы
              </span>
            </div>

            <div className="text-2xl font-bold">{stats.uptime.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, URL или проекту..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все проекты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              {projectsData.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="healthy">Работает</SelectItem>
              <SelectItem value="warning">Отключен</SelectItem>
              <SelectItem value="error">Ошибка</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Проекты */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Проекты</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {projectsData.map((project) => {
            const projectMonitors = monitorsData.filter(
              (m) => m.project === project.id,
            );
            const activeMonitors = projectMonitors.filter((m) => m.enabled);
            const projectIncidents = incidentsData.filter((incident) => {
              const monitor = monitorsData.find(
                (m) => m.id === incident.monitor,
              );
              return monitor?.project === project.id && incident.active;
            });

            const uptime =
              projectMonitors.length > 0
                ? (activeMonitors.length / projectMonitors.length) * 100
                : 0;

            const status =
              projectIncidents.length > 0
                ? "error"
                : activeMonitors.length === projectMonitors.length &&
                    projectMonitors.length > 0
                  ? "healthy"
                  : "warning";

            return (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
                onClick={() => {
                  setLocation(`/panels/${project.id}`);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <IconGlobe className="h-5 w-5 text-blue-600" />
                        {project.name}
                      </CardTitle>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        status,
                      )} flex-shrink-0 mt-1`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {projectMonitors.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Всего мониторов
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {activeMonitors.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Активных
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Состояние:
                        </span>
                        <Badge
                          variant={
                            status === "healthy"
                              ? "outline"
                              : status === "warning"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {getStatusText(status)}
                        </Badge>
                      </div>

                      {uptime > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Время работы:
                          </span>
                          <span className="text-sm font-medium">
                            {uptime.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {projectIncidents.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Активные инциденты:
                          </span>
                          <Badge variant="destructive">
                            {projectIncidents.length}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Владельцы:
                        </span>
                        <span className="text-sm">
                          {project.owners.length} чел.
                        </span>
                      </div>
                    </div>

                    {/* Мини-график статусов мониторов */}
                    {projectMonitors.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">
                          Мониторы:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {projectMonitors.map((monitor) => {
                            const monitorStatus = getMonitorStatus(monitor);
                            return (
                              <div
                                key={`project-${project.id}-monitor-${monitor.id}`}
                                className={`w-3 h-3 rounded-full ${getStatusColor(
                                  monitorStatus,
                                )} hover:w-4 hover:h-4 transition-all cursor-pointer`}
                                title={`${monitor.name} - ${getStatusText(
                                  monitorStatus,
                                )}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {projectsData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <IconGlobe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Проекты не найдены</h3>
              <p className="text-muted-foreground">
                Создайте первый проект для организации ваших мониторов
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Мониторы */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Мониторы</h2>
          <div className="flex items-center text-sm text-muted-foreground">
            <IconClock className="mr-1 h-4 w-4" />
            Обновлено:{" "}
            {new Date().toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMonitors.map((monitor) => {
            const status = getMonitorStatus(monitor);
            const project = projectsData.find((p) => p.id === monitor.project);

            return (
              <Card
                key={monitor.id}
                className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{monitor.name}</CardTitle>
                      <CardDescription className="break-all">
                        {monitor.url}
                      </CardDescription>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(status)} flex-shrink-0 mt-1`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Состояние:
                      </span>
                      <Badge
                        variant={
                          status === "healthy"
                            ? "outline"
                            : status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {getStatusText(status)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Метод:
                      </span>
                      <Badge variant="outline">{monitor.method}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Тип:
                      </span>
                      <div className="flex items-center gap-1">
                        {monitor.type === "http" && (
                          <IconWifi className="h-3 w-3" />
                        )}
                        <span className="text-sm">
                          {monitor.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {project && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Проект:
                        </span>
                        <span className="text-sm font-medium">
                          {project.name}
                        </span>
                      </div>
                    )}

                    {monitor.interval_sec && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Интервал:
                        </span>
                        <span className="text-sm">{monitor.interval_sec}с</span>
                      </div>
                    )}

                    {monitor.timeout_ms && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Таймаут:
                        </span>
                        <span className="text-sm">{monitor.timeout_ms}мс</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        SSL проверка:
                      </span>
                      <div className="flex items-center gap-1">
                        <IconShield className="h-3 w-3" />
                        <span className="text-sm">
                          {monitor.verify_ssl ? "Включена" : "Отключена"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Последние проверки:
                        </span>
                      </div>
                      <LastStatuses monitorId={monitor.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredMonitors.length === 0 && searchTerm && (
          <Card>
            <CardContent className="p-12 text-center">
              <IconSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Мониторы не найдены
              </h3>
              <p className="text-muted-foreground">
                Попробуйте изменить поисковый запрос или фильтры
              </p>
            </CardContent>
          </Card>
        )}

        {monitorsData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <IconActivity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Мониторы не найдены
              </h3>
              <p className="text-muted-foreground">
                Создайте первый монитор для отслеживания ваших сервисов
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Последние инциденты */}
      {incidentsData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Последние инциденты</h2>
          <div className="grid grid-cols-1 gap-4">
            {incidentsData.slice(0, 5).map((incident) => {
              const monitor = monitorsData.find(
                (m) => m.id === incident.monitor,
              );
              const project = monitor
                ? projectsData.find((p) => p.id === monitor.project)
                : null;

              return (
                <Card key={incident.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {incident.active ? "Активный" : "Закрыт"}
                          </Badge>
                          <span className="text-sm font-medium">
                            {monitor?.name || `Монитор #${incident.monitor}`}
                          </span>
                          {project && (
                            <span className="text-xs text-muted-foreground">
                              • {project.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {incident.reason || "Неизвестная причина"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Открыт:{" "}
                            {new Date(incident.opened_at).toLocaleString(
                              "ru-RU",
                            )}
                          </span>
                          {incident.closed_at && (
                            <span>
                              Закрыт:{" "}
                              {new Date(incident.closed_at).toLocaleString(
                                "ru-RU",
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${incident.active ? "bg-red-500" : "bg-gray-400"}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
