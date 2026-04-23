import {
  IconBriefcase,
  IconClock,
  IconLayoutGrid,
  IconRefresh,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSourceStats } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const SOURCE_STYLES: Record<string, { badge: string; accent: string; label: string }> = {
  "fl.ru": {
    badge:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    accent: "border-t-blue-500",
    label:  "FL.ru",
  },
  "freelancejob.ru": {
    badge:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    accent: "border-t-green-500",
    label:  "FreelanceJob.ru",
  },
  "freelance.ru": {
    badge:  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    accent: "border-t-orange-500",
    label:  "Freelance.ru",
  },
  "weblancer.net": {
    badge:  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    accent: "border-t-violet-500",
    label:  "Weblancer.net",
  },
  "workzilla.com": {
    badge:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    accent: "border-t-amber-500",
    label:  "Work-Zilla.com",
  },
};

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr.replace(" ", "T"));
  const diffMs = Date.now() - date.getTime();
  const diffH  = Math.floor(diffMs / 3_600_000);
  if (diffH < 1)  return "только что";
  if (diffH < 24) return `${diffH} ч назад`;
  return `${Math.floor(diffH / 24)} дн назад`;
}

export default function Sources() {
  const { data: sources, isLoading, refetch } = useSourceStats();

  const totalTasks  = sources?.reduce((s, x) => s + x.total, 0) ?? 0;
  const totalNew    = sources?.reduce((s, x) => s + x.new_today, 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Источники</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Загрузка..."
              : `${sources?.length ?? 0} фриланс-площадок · ${totalTasks.toLocaleString("ru-RU")} заданий`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <IconRefresh className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Сводные карточки */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Источников</CardTitle>
            <IconLayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sources?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">подключённых площадок</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего заданий</CardTitle>
            <IconBriefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks.toLocaleString("ru-RU")}</div>
            <p className="text-xs text-muted-foreground mt-1">в базе данных</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Новых сегодня</CardTitle>
            <IconTrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              +{totalNew.toLocaleString("ru-RU")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">добавлено за 24 часа</p>
          </CardContent>
        </Card>
      </div>

      {/* Карточки источников */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Площадки</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-t-4">
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-28 rounded-full mb-4" />
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-3 w-24 mb-3" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </CardContent>
                </Card>
              ))
            : sources?.map((src) => {
                const cfg = SOURCE_STYLES[src.source] ?? {
                  badge: "bg-gray-100 text-gray-800",
                  accent: "border-t-gray-400",
                  label: src.source,
                };

                return (
                  <Card
                    key={src.source}
                    className={cn("border-t-4 hover:shadow-lg transition-all", cfg.accent)}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cfg.badge)}>
                          {cfg.label}
                        </span>
                        <Link href={`/tasks?source=${encodeURIComponent(src.source)}`}>
                          <Button variant="ghost" size="sm" className="text-xs h-7">
                            Смотреть
                          </Button>
                        </Link>
                      </div>

                      <div>
                        <div className="text-3xl font-bold">
                          {src.total.toLocaleString("ru-RU")}
                        </div>
                        <p className="text-sm text-muted-foreground">заданий</p>
                      </div>

                      <div className="space-y-1.5 pt-1 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <IconTrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            +{src.new_today} сегодня
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IconClock className="h-3.5 w-3.5 shrink-0" />
                          {src.last_parsed ? `Обновлено ${formatRelativeTime(src.last_parsed)}` : "Нет данных"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
    </div>
  );
}
