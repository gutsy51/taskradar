import {
  IconBriefcase,
  IconClock,
  IconCurrencyRubel,
  IconExternalLink,
  IconLayoutGrid,
  IconRefresh,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchTasks, useSourceStats } from "@/hooks/use-api";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_STYLES: Record<string, string> = {
  "fl.ru":           "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "freelancejob.ru": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "freelance.ru":    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "weblancer.net":   "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "workzilla.com":   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const SOURCE_BORDER: Record<string, string> = {
  "fl.ru":           "border-l-blue-500",
  "freelancejob.ru": "border-l-green-500",
  "freelance.ru":    "border-l-orange-500",
  "weblancer.net":   "border-l-violet-500",
  "workzilla.com":   "border-l-amber-500",
};

function formatPrice(price: number | null, currency: string) {
  if (price === null) return null;
  if (price === 0) return "по договорённости";
  const symbol = currency === "RUB" ? "₽" : currency || "₽";
  return `${price.toLocaleString("ru-RU")} ${symbol}`;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr.replace(" ", "T"));
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "только что";
  if (diffH < 24) return `${diffH} ч назад`;
  return `${Math.floor(diffH / 24)} дн назад`;
}

function RecentTaskCard({ task }: { task: Task }) {
  const price = formatPrice(task.price, task.price_currency);
  const sourceStyle = SOURCE_STYLES[task.source] ?? "bg-gray-100 text-gray-800";
  const borderStyle = SOURCE_BORDER[task.source] ?? "border-l-gray-400";

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-all", borderStyle)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", sourceStyle)}>
                {task.source}
              </span>
              {price && (
                <span className="text-sm font-semibold text-primary">{price}</span>
              )}
            </div>
            <p className="text-sm font-medium leading-snug line-clamp-1">{task.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(task.published_at ?? task.collected_at)}
            </span>
            <a href={task.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <IconExternalLink className="h-3 w-3" />
                Открыть
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: searchResult, isLoading: tasksLoading, refetch: refetchTasks } = useSearchTasks({ limit: 5 });
  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useSourceStats();

  const isLoading = tasksLoading || sourcesLoading;

  const totalTasks   = sources?.reduce((s, x) => s + x.total, 0) ?? 0;
  const newToday     = sources?.reduce((s, x) => s + x.new_today, 0) ?? 0;
  const sourcesCount = sources?.length ?? 0;

  const recentTasks = searchResult?.items ?? [];

  const handleRefresh = () => {
    refetchTasks();
    refetchSources();
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">TaskRadar</h1>
          <p className="text-muted-foreground text-lg">
            Агрегатор фриланс-заданий с&nbsp;ведущих площадок
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <IconRefresh className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Основная статистика */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Всего заданий</CardTitle>
                <IconBriefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasks.toLocaleString("ru-RU")}</div>
                <p className="text-xs text-muted-foreground mt-1">со всех источников</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Новых сегодня</CardTitle>
                <IconTrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  +{newToday.toLocaleString("ru-RU")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">за последние 24 часа</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Источников</CardTitle>
                <IconLayoutGrid className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sourcesCount}</div>
                <p className="text-xs text-muted-foreground mt-1">фриланс-площадок</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Найдено по запросу</CardTitle>
                <IconCurrencyRubel className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {(searchResult?.total ?? 0).toLocaleString("ru-RU")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">последних заданий</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Источники */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Источники</h2>
          <Link href="/sources">
            <Button variant="ghost" size="sm">Все источники →</Button>
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            : sources?.map((src) => (
                <Card
                  key={src.source}
                  className="hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    window.location.href = `/tasks?source=${encodeURIComponent(src.source)}`;
                  }}
                >
                  <CardContent className="p-4 space-y-1">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full inline-block",
                      SOURCE_STYLES[src.source] ?? "bg-gray-100 text-gray-800")}>
                      {src.source}
                    </span>
                    <div className="text-2xl font-bold pt-1">
                      {src.total.toLocaleString("ru-RU")}
                    </div>
                    <p className="text-xs text-muted-foreground">заданий</p>
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <IconTrendingUp className="h-3 w-3" />
                      +{src.new_today} сегодня
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IconClock className="h-3 w-3" />
                      {src.last_parsed ? formatRelativeTime(src.last_parsed) : "—"}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* Последние задания */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Последние задания</h2>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">Все задания →</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <RecentTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
