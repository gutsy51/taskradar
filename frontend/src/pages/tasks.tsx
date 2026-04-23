import {
  IconBriefcase,
  IconChevronLeft,
  IconChevronRight,
  IconCurrencyRubel,
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchTasks, useSourceStats } from "@/hooks/use-api";
import type { SearchTasksPayload } from "@/lib/client";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

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

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "Цена не указана";
  if (price === 0)    return "По договорённости";
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

function getPriceBadgeVariant(price: number | null) {
  if (price === null) return "secondary";
  if (price === 0)    return "outline";
  return "default" as const;
}

function TaskCard({ task }: { task: Task }) {
  const priceText   = formatPrice(task.price, task.price_currency);
  const sourceStyle = SOURCE_STYLES[task.source] ?? "bg-gray-100 text-gray-800";
  const borderStyle = SOURCE_BORDER[task.source] ?? "border-l-gray-400";

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-all group", borderStyle)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", sourceStyle)}>
                {task.source}
              </span>
              <Badge variant={getPriceBadgeVariant(task.price)} className="shrink-0">
                <IconCurrencyRubel className="h-3 w-3 mr-0.5" />
                {priceText}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {formatRelativeTime(task.published_at ?? task.collected_at)}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
              {task.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          </div>
          <div className="shrink-0">
            <a href={task.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconExternalLink className="h-3.5 w-3.5" />
                Перейти
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function buildPayload(
  query: string,
  source: string,
  priceFilter: string,
  page: number,
): SearchTasksPayload {
  const payload: SearchTasksPayload = {
    query,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  if (source !== "all") payload.source = [source];

  if (priceFilter === "with_price")   payload.price_min = 1;
  else if (priceFilter === "negotiable") { payload.price_min = 0; payload.price_max = 0; }
  else if (priceFilter === "no_price") payload.price_is_specified = false;

  return payload;
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="h-8 w-8 p-0"
      >
        <IconChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(p)}
            className="h-8 w-8 p-0 text-xs"
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="h-8 w-8 p-0"
      >
        <IconChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Tasks() {
  const [search, setSearch]           = useState("");
  const [source, setSource]           = useQueryState("source", parseAsString.withDefault("all"));
  const [priceFilter, setPriceFilter] = useState("all");
  const [page, setPage]               = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // При смене фильтров возвращаемся на первую страницу
  useEffect(() => { setPage(1); }, [debouncedSearch, source, priceFilter]);

  const payload = useMemo(
    () => buildPayload(debouncedSearch, source, priceFilter, page),
    [debouncedSearch, source, priceFilter, page],
  );

  const { data: searchResult, isLoading: tasksLoading, refetch } = useSearchTasks(payload);
  const { data: sources, isLoading: sourcesLoading } = useSourceStats();

  const isLoading  = tasksLoading || sourcesLoading;
  const tasks      = searchResult?.items ?? [];
  const total      = searchResult?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  const hasFilters = search || source !== "all" || priceFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setSource("all");
    setPriceFilter("all");
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Задания</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Загрузка..."
              : total > 0
                ? `${from}–${to} из ${total.toLocaleString("ru-RU")} заданий`
                : "Нет заданий"}
            {source !== "all" && ` · ${source}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <IconRefresh className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Источник" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все источники</SelectItem>
            {sources?.map((s) => (
              <SelectItem key={s.source} value={s.source}>
                {s.source}
                <span className="ml-1.5 text-muted-foreground text-xs">
                  {s.total.toLocaleString("ru-RU")}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Цена" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любая цена</SelectItem>
            <SelectItem value="with_price">С ценой</SelectItem>
            <SelectItem value="negotiable">По договорённости</SelectItem>
            <SelectItem value="no_price">Цена не указана</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-1.5 shrink-0">
            <IconX className="h-4 w-4" />
            Сбросить
          </Button>
        )}
      </div>

      {/* Список заданий */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <>
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            {hasFilters ? (
              <>
                <IconSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ничего не найдено</h3>
                <p className="text-muted-foreground mb-4">
                  Попробуйте изменить запрос или фильтры
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              </>
            ) : (
              <>
                <IconBriefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Задания не найдены</h3>
                <p className="text-muted-foreground">
                  Запустите парсеры для загрузки заданий
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
