import {
  Activity,
  AlertCircle,
  CheckCircle,
  Folder,
  Monitor,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeStats } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  description?: string;
  icon: React.ReactNode;
  trend?: number;
  variant?: "default" | "success" | "warning" | "destructive";
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    success:
      "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30",
    warning:
      "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/30",
    destructive:
      "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30",
  };

  return (
    <Card
      className={cn("transition-all hover:shadow-md", variantStyles[variant])}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center mt-2">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-500">+{trend}% этот месяц</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { stats, isLoading, isError } = useHomeStats();

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Ошибка загрузки
          </h1>
          <p className="text-muted-foreground">
            Не удалось загрузить данные панели мониторинга
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Приветствие */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Добро пожаловать в PingTower
        </h1>
        <p className="text-muted-foreground text-lg">
          Обзор вашей системы мониторинга и статистики
        </p>
      </div>

      {/* Основная статистика */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Основная статистика
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Всего мониторов"
                value={stats.totalMonitors}
                description={`${stats.activeMonitors} активных`}
                icon={<Monitor />}
                variant={stats.totalMonitors > 0 ? "default" : "warning"}
              />
              <StatCard
                title="Пользователи"
                value={stats.totalUsers}
                description={`${stats.activeUsers} активных`}
                icon={<Users />}
                variant="default"
              />
              <StatCard
                title="Проекты"
                value={stats.totalProjects}
                description="Общее количество"
                icon={<Folder />}
                variant="default"
              />
              <StatCard
                title="Инциденты"
                value={stats.totalIncidents}
                description={`${stats.activeIncidents} активных`}
                icon={<AlertCircle />}
                variant={stats.activeIncidents > 0 ? "destructive" : "success"}
              />
            </>
          )}
        </div>
      </div>

      {/* Статус системы */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Статус системы
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card
                className={cn(
                  "transition-all hover:shadow-md",
                  stats.activeMonitors === stats.totalMonitors
                    ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
                    : "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/30",
                )}
              >
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Мониторы
                    <Badge
                      variant={
                        stats.activeMonitors === stats.totalMonitors
                          ? "default"
                          : "secondary"
                      }
                    >
                      {stats.activeMonitors}/{stats.totalMonitors}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    {stats.totalMonitors > 0
                      ? `${Math.round((stats.activeMonitors / stats.totalMonitors) * 100)}% активных`
                      : "Нет мониторов"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Процент активных мониторов
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "transition-all hover:shadow-md",
                  stats.activeIncidents === 0
                    ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
                    : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30",
                )}
              >
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Инциденты
                    <Badge
                      variant={
                        stats.activeIncidents === 0 ? "default" : "destructive"
                      }
                    >
                      {stats.activeIncidents} активных
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    {stats.activeIncidents === 0
                      ? "Все в порядке"
                      : "Требует внимания"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.activeIncidents === 0
                      ? "Нет активных инцидентов"
                      : `${stats.activeIncidents} из ${stats.totalIncidents} активных`}
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-md border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Пользователи
                    <Badge variant="outline">
                      {stats.activeUsers} активных
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    {stats.totalUsers > 0
                      ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% активности`
                      : "Нет пользователей"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Процент активных пользователей
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Быстрые действия */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Быстрые действия</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105">
            <CardContent className="p-6 text-center">
              <Monitor className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Создать монитор</h3>
              <p className="text-sm text-muted-foreground">
                Добавить новый монитор для отслеживания сервиса
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105">
            <CardContent className="p-6 text-center">
              <Folder className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Новый проект</h3>
              <p className="text-sm text-muted-foreground">
                Создать новый проект для организации мониторов
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Управление пользователями</h3>
              <p className="text-sm text-muted-foreground">
                Просмотр и управление пользователями системы
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
