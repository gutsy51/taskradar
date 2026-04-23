import {
  IconArrowLeft,
  IconCurrencyRubel,
  IconExternalLink,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimilarTasks, useTask } from "@/hooks/use-api";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { application } from "@/states/application";

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
  if (price === null) return "Цена не указана";
  if (price === 0)    return "По договорённости";
  return `${price.toLocaleString("ru-RU")} ${currency === "RUB" ? "₽" : currency || "₽"}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr.replace(" ", "T")).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function SimilarCard({ task }: { task: Task }) {
  const borderStyle = SOURCE_BORDER[task.source] ?? "border-l-gray-400";
  const sourceStyle = SOURCE_STYLES[task.source] ?? "bg-gray-100 text-gray-800";
  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-all group", borderStyle)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", sourceStyle)}>
            {task.source}
          </span>
          {task.similarity !== null && (
            <Badge variant="secondary" className="font-mono text-xs shrink-0">
              {Math.round(task.similarity * 100)}%
            </Badge>
          )}
        </div>
        <Link href={`/tasks/${task.id}`}>
          <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors hover:underline line-clamp-2">
            {task.title}
          </h4>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <IconCurrencyRubel className="h-3 w-3" />
            {formatPrice(task.price, task.price_currency)}
          </span>
          <a href={task.url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              <IconExternalLink className="h-3 w-3" />
              Открыть
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);

  const { data: task, isLoading: taskLoading, isError } = useTask(taskId);
  const { data: similar, isLoading: similarLoading } = useSimilarTasks(taskId);

  useEffect(() => {
    application.header = task?.title ?? "Задание";
    return () => { application.header = undefined; };
  }, [task?.title]);

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Задание не найдено.</p>
        <Link href="/tasks">
          <Button variant="outline" className="mt-4 gap-2">
            <IconArrowLeft className="h-4 w-4" />
            К заданиям
          </Button>
        </Link>
      </div>
    );
  }

  const borderStyle = task ? (SOURCE_BORDER[task.source] ?? "border-l-gray-400") : "border-l-muted";
  const sourceStyle = task ? (SOURCE_STYLES[task.source] ?? "bg-gray-100 text-gray-800") : "";

  return (
    <div className="p-6 space-y-6">
      {/* Назад */}
      <Link href="/tasks">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <IconArrowLeft className="h-4 w-4" />
          К заданиям
        </Button>
      </Link>

      {/* Основная карточка */}
      {taskLoading ? (
        <Card className="border-l-4 border-l-muted">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : task ? (
        <Card className={cn("border-l-4", borderStyle)}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", sourceStyle)}>
                    {task.source}
                  </span>
                  <Badge variant={task.price === null ? "secondary" : task.price === 0 ? "outline" : "default"}>
                    <IconCurrencyRubel className="h-3 w-3 mr-0.5" />
                    {formatPrice(task.price, task.price_currency)}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold leading-snug">{task.title}</h1>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {task.published_at && (
                    <span>Опубликовано: {formatDate(task.published_at)}</span>
                  )}
                  <span>Собрано: {formatDate(task.collected_at)}</span>
                </div>
              </div>
              <a href={task.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button className="gap-2">
                  <IconExternalLink className="h-4 w-4" />
                  Перейти
                </Button>
              </a>
            </div>

            <Separator />

            <p className="text-sm leading-relaxed whitespace-pre-line">
              {task.description || <span className="text-muted-foreground">Описание отсутствует</span>}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Похожие задания */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Похожие задания</h2>
        {similarLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (similar?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Не найдены — задание ещё не векторизировано.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {similar!.items.map((t) => <SimilarCard key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
