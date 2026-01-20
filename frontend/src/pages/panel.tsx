import { IconTrash } from "@tabler/icons-react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  EllipsisVertical,
  Globe,
  Monitor,
  Plus,
  Settings,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import { useSnapshot } from "valtio";
import { useLocation, useParams } from "wouter";
import {
  IncidentsChart,
  ResponseTimeChart,
  UptimeChart,
} from "@/components/project-charts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerTrigger,
} from "@/components/ui/dropdrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countFormat } from "@/core/text";
import {
  useDeleteMonitor,
  useDeleteProject,
  useMonitorStatuses,
  useProject,
  useProjectIncidents,
  useProjectMonitors,
} from "@/hooks/use-project";
import type { Monitor as MonitorType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { application } from "@/states/application";
import { toast } from "sonner";

function formatLastCheck(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

function MonitorCard({
  monitor,
  status,
}: {
  monitor: MonitorType;
  status?: any;
}) {
  const deleteMonitor = useDeleteMonitor();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    deleteMonitor.mutate(monitor.id);
    setShowDeleteDialog(false);
  };

  const statusColor =
    status?.status === "up"
      ? "text-green-600"
      : status?.status === "down"
        ? "text-red-600"
        : "text-gray-500";
  const statusIcon =
    status?.status === "up"
      ? CheckCircle
      : status?.status === "down"
        ? XCircle
        : Clock;

  const StatusIcon = statusIcon;

  return (
    <>
      <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-base font-medium truncate">
                {monitor.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 truncate">
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{monitor.url}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant={
                  status?.status === "up"
                    ? "outline"
                    : status?.status === "down"
                      ? "destructive"
                      : "secondary"
                }
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {status?.status === "up"
                  ? "Работает"
                  : status?.status === "down"
                    ? "Недоступен"
                    : "Неизвестно"}
              </Badge>

              <DropDrawer>
                <DropDrawerTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropDrawerTrigger>
                <DropDrawerContent>
                  <DropDrawerItem
                    onClick={() => setShowDeleteDialog(true)}
                    icon={<IconTrash className="w-4 h-4 mr-2" />}
                    variant="destructive"
                  >
                    Удалить
                  </DropDrawerItem>
                </DropDrawerContent>
              </DropDrawer>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Время работы</div>
              <div className="font-medium text-sm">
                {status?.uptime ? (
                  <span
                    className={
                      status.uptime >= 99
                        ? "text-green-600"
                        : status.uptime >= 95
                          ? "text-yellow-600"
                          : "text-red-600"
                    }
                  >
                    {status.uptime.toFixed(1)}%
                  </span>
                ) : (
                  "--"
                )}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Ответ</div>
              <div className="font-medium text-sm">
                {status?.responseTime ? (
                  <span
                    className={
                      status.responseTime < 200
                        ? "text-green-600"
                        : status.responseTime < 500
                          ? "text-yellow-600"
                          : "text-red-600"
                    }
                  >
                    {status.responseTime.toFixed(0)}ms
                  </span>
                ) : (
                  "--"
                )}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Проверка</div>
              <div className="font-medium text-sm">
                {status?.lastCheck ? formatLastCheck(status.lastCheck) : "--"}
              </div>
            </div>
          </div>

          {/* Полоса статуса */}
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                status?.status === "up"
                  ? "bg-green-500"
                  : status?.status === "down"
                    ? "bg-red-500"
                    : "bg-gray-400"
              }`}
              style={{
                width: status?.uptime ? `${status.uptime}%` : "0%",
              }}
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить монитор?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Монитор "{monitor.name}" и все
              связанные с ним данные будут удалены навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMonitor.isPending}
            >
              {deleteMonitor.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

enum Tab {
  Monitors = "monitors",
  Incidents = "incidents",
  Analytics = "analytics",
}

export default function Panel() {
  const params = useParams<{ id: string }>();
  const projectId = params.id ? parseInt(params.id) : 0;

  const [, setLocation] = useLocation();

  const { tvMode } = useSnapshot(application);
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);
  const deleteProject = useDeleteProject();

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum<Tab>(Object.values(Tab)).withDefault(Tab.Monitors),
  );

  const handleDeleteProject = () => {
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        // Перенаправляем на страницу панелей после удаления
        setLocation("/panels");

        toast.success("Проект успешно удален");
      },
    });
    setShowDeleteProjectDialog(false);
  };

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId);
  const { data: monitors = [], isLoading: monitorsLoading } =
    useProjectMonitors(projectId);
  const { data: statuses = [] } = useMonitorStatuses(monitors);
  const monitorIds = monitors.map((m) => m.id);
  const { data: incidents = [] } = useProjectIncidents(monitorIds);

  if (projectLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">Проект не найден</h3>
              <p className="text-muted-foreground">
                Проект с ID {projectId} не существует или недоступен.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.active);
  const upMonitors = statuses.filter((s) => s.status === "up").length;
  const downMonitors = statuses.filter((s) => s.status === "down").length;
  const avgUptime =
    statuses.length > 0
      ? statuses.reduce((acc, s) => acc + s.uptime, 0) / statuses.length
      : 0;
  const avgResponseTime =
    statuses.length > 0
      ? statuses.reduce((acc, s) => acc + s.responseTime, 0) / statuses.length
      : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок проекта */}
      {!tvMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge variant="outline" className="text-xs">
                {monitors.length} мониторов
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Мониторинг и метрики для проекта {project.slug}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" disabled>
              <Users className="h-4 w-4 mr-2" />
              Команда
            </Button>

            <Button variant="outline" size="sm" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Button>

            <Button
              size="sm"
              onClick={() => {
                application.creation.monitor = true;
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить монитор
            </Button>

            <DropDrawer>
              <DropDrawerTrigger>
                <Button variant="ghost" size="sm" className="p-2">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropDrawerTrigger>

              <DropDrawerContent>
                <DropDrawerItem
                  onClick={() => setShowDeleteProjectDialog(true)}
                  icon={<IconTrash className="w-4 h-4 mr-2" />}
                  variant="destructive"
                >
                  Удалить
                </DropDrawerItem>
              </DropDrawerContent>
            </DropDrawer>
          </div>
        </div>
      )}

      {/* Статистика */}
      {!tvMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Всего мониторов
              </CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monitors.length}</div>
              <p className="text-xs text-muted-foreground">
                <span>{upMonitors} работает</span>

                {downMonitors > 0 && (
                  <>
                    ,{" "}
                    <span className="text-red-600">
                      {downMonitors} недоступно
                    </span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Среднее время работы
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgUptime.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                за последние 30 дней
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Время ответа
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgResponseTime.toFixed(0)} мс
              </div>
              <p className="text-xs text-muted-foreground">
                среднее за сегодня
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Активные инциденты
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold">{activeIncidents.length}</div>

              <p className="text-xs text-muted-foreground">требуют внимания</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Контент */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="space-y-4"
      >
        <TabsList
          className={cn({
            hidden: tvMode,
          })}
        >
          <TabsTrigger value={Tab.Monitors}>Мониторы</TabsTrigger>
          <TabsTrigger value={Tab.Incidents}>Инциденты</TabsTrigger>
          <TabsTrigger value={Tab.Analytics}>Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="monitors" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {monitors.length}{" "}
              {countFormat(monitors.length, "монитор", "монитора", "мониторов")}{" "}
              {countFormat(monitors.length, "найден", "найдено", "найдено")}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Обновление каждые 30 сек
            </div>
          </div>

          {monitorsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : monitors.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Monitor className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Нет мониторов</h3>
                  <p className="text-muted-foreground">
                    Добавьте первый монитор для отслеживания вашего сервиса.
                  </p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Создать монитор
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {monitors.map((monitor) => {
                const status = statuses.find((s) => s.id === monitor.id);
                return (
                  <MonitorCard
                    key={monitor.id}
                    monitor={monitor}
                    status={status}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <CheckCircle className="h-12 w-12 mx-auto" />

                  <h3 className="text-lg font-semibold">Нет инцидентов</h3>
                  <p className="text-muted-foreground">
                    Все мониторы работают нормально.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Card key={incident.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Инцидент #{incident.id}
                      </CardTitle>
                      <Badge
                        variant={incident.active ? "destructive" : "secondary"}
                      >
                        {incident.active ? "Активный" : "Закрыт"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {incident.reason || "Монитор недоступен"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Начался:{" "}
                        {new Date(incident.opened_at).toLocaleString("ru")}
                      </span>
                      {incident.closed_at && (
                        <span>
                          Закрыт:{" "}
                          {new Date(incident.closed_at).toLocaleString("ru")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UptimeChart />
            <ResponseTimeChart />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncidentsChart />
            <Card>
              <CardHeader>
                <CardTitle>SLA Отчет</CardTitle>
                <CardDescription>
                  Соглашение об уровне обслуживания
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Месячный SLA</div>
                      <div className="text-sm text-muted-foreground">
                        Целевой показатель: 99.9%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        99.8%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Текущий
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Время простоя</div>
                      <div className="text-sm text-muted-foreground">
                        За текущий месяц
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">2.4ч</div>
                      <div className="text-xs text-muted-foreground">Всего</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">MTTR</div>
                      <div className="text-sm text-muted-foreground">
                        Среднее время восстановления
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">12мин</div>
                      <div className="text-xs text-muted-foreground">
                        В среднем
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={showDeleteProjectDialog}
        onOpenChange={setShowDeleteProjectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Проект "{project?.name}" и все
              связанные с ним мониторы, инциденты и данные будут удалены
              навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Удаление..." : "Удалить проект"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
