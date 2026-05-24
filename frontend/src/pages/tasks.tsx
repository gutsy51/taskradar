import {
  IconBriefcase,
  IconChevronLeft,
  IconChevronRight,
  IconCurrencyRubel,
  IconExternalLink,
  IconMenu2,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchTasks, useSourceStats } from "@/hooks/use-api";
import type { SearchTasksPayload } from "@/lib/client";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { application } from "@/states/application";

const PAGE_SIZE = 20;

type PriceFilter = "any" | "unspecified" | "negotiable" | "specified";
type SortValue = "freshness" | "price_desc" | "price_asc" | "relevance";

const SOURCE_STYLES: Record<string, string> = {
  "fl.ru": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "freelancejob.ru": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "freelance.ru": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "weblancer.net": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "workzilla.com": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const SOURCE_BORDER: Record<string, string> = {
  "fl.ru": "border-l-blue-500",
  "freelancejob.ru": "border-l-green-500",
  "freelance.ru": "border-l-orange-500",
  "weblancer.net": "border-l-violet-500",
  "workzilla.com": "border-l-amber-500",
};

const PRICE_FILTER_LABELS: Record<PriceFilter, string> = {
  any: "Любая цена",
  unspecified: "Не указана",
  negotiable: "По договоренности",
  specified: "Указана",
};

const CURRENCY_OPTIONS = [
  { value: "all", label: "Любая" },
  { value: "RUB", label: "RUB" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "KZT", label: "KZT" },
  { value: "BYN", label: "BYN" },
] as const;

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "Цена не указана";
  if (price === 0) return "По договоренности";
  const symbol = currency === "RUB" ? "₽" : currency || "₽";
  return `${price.toLocaleString("ru-RU")} ${symbol}`;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr.replace(" ", "T"));
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);

  if (Number.isNaN(date.getTime())) return "";
  if (diffH < 1) return "только что";
  if (diffH < 24) return `${diffH} ч назад`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} дн назад`;

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getPriceBadgeVariant(price: number | null): "default" | "secondary" | "outline" {
  if (price === null) return "secondary";
  if (price === 0) return "outline";
  return "default";
}

function parseMoneyInput(value: string): number | undefined {
  if (!value.trim()) return undefined;

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;

  return Math.floor(parsed);
}

function buildPayload(params: {
  query: string;
  keywords: string;
  sources: string[];
  priceFilter: PriceFilter;
  priceFrom: string;
  priceTo: string;
  currency: string;
  fromDate: string;
  toDate: string;
  sort: SortValue;
  page: number;
}): SearchTasksPayload {
  const payload: SearchTasksPayload = {
    query: params.query.trim(),
    keywords: params.keywords.trim(),
    sort: params.sort,
    limit: PAGE_SIZE,
    offset: (params.page - 1) * PAGE_SIZE,
  };

  if (params.sources.length > 0) payload.source = params.sources;
  if (params.fromDate) payload.from_date = params.fromDate;
  if (params.toDate) payload.to_date = params.toDate;

  if (params.priceFilter !== "any") {
    payload.price_mode = params.priceFilter;
  }

  if (params.priceFilter === "specified") {
    payload.price_is_specified = true;

    const priceMin = parseMoneyInput(params.priceFrom);
    const priceMax = parseMoneyInput(params.priceTo);

    if (priceMin !== undefined) payload.price_min = priceMin;
    if (priceMax !== undefined) payload.price_max = priceMax;
    if (params.currency !== "all") payload.price_currency = [params.currency];
  }

  return payload;
}

function TaskCard({ task, isSearch }: { task: Task; isSearch: boolean }) {
  const priceText = formatPrice(task.price, task.price_currency);
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
              {isSearch && task.similarity !== null && (
                <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                  {Math.round(task.similarity * 100)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {formatRelativeTime(task.published_at ?? task.collected_at)}
              </span>
            </div>
            <Link href={`/tasks/${task.id}`}>
              <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors hover:underline">
                {task.title}
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{task.description}</p>
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

  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
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
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
            ...
          </span>
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
  const [search, setSearch] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sourceParam, setSourceParam] = useQueryState("source", parseAsString.withDefault("all"));
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("any");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [currency, setCurrency] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<SortValue>("freshness");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedKeywords, setDebouncedKeywords] = useState("");

  const sourceParamSources = useMemo(
    () => (sourceParam === "all" ? [] : sourceParam.split(",").map((item) => item.trim()).filter(Boolean)),
    [sourceParam],
  );

  const { data: sources, isLoading: sourcesLoading } = useSourceStats();
  const allSourceNames = useMemo(() => sources?.map((item) => item.source) ?? [], [sources]);
  const selectedSources = useMemo(
    () => (sourceParam === "all" ? allSourceNames : sourceParamSources),
    [allSourceNames, sourceParam, sourceParamSources],
  );
  const isExplicitAllSources = useMemo(
    () =>
      allSourceNames.length > 0 &&
      sourceParamSources.length === allSourceNames.length &&
      allSourceNames.every((source) => sourceParamSources.includes(source)),
    [allSourceNames, sourceParamSources],
  );
  const sourceFilterActive = sourceParam !== "all" && !isExplicitAllSources;
  const payloadSources = useMemo(
    () => (sourceFilterActive ? sourceParamSources : []),
    [sourceFilterActive, sourceParamSources],
  );

  useEffect(() => {
    application.header = "Задания";
    return () => {
      application.header = undefined;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedKeywords(keywords);
    }, 500);

    return () => clearTimeout(timeout);
  }, [search, keywords]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    debouncedKeywords,
    sourceParam,
    priceFilter,
    priceFrom,
    priceTo,
    currency,
    fromDate,
    toDate,
    sort,
  ]);

  const payload = useMemo(
    () =>
      buildPayload({
        query: debouncedSearch,
        keywords: debouncedKeywords,
        sources: payloadSources,
        priceFilter,
        priceFrom,
        priceTo,
        currency,
        fromDate,
        toDate,
        sort,
        page,
      }),
    [
      debouncedSearch,
      debouncedKeywords,
      payloadSources,
      priceFilter,
      priceFrom,
      priceTo,
      currency,
      fromDate,
      toDate,
      sort,
      page,
    ],
  );

  const { data: searchResult, isLoading: tasksLoading, refetch } = useSearchTasks(payload);

  const isLoading = tasksLoading || sourcesLoading;
  const tasks = searchResult?.items ?? [];
  const total = searchResult?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const isSearchMode = Boolean(debouncedSearch || debouncedKeywords);
  const activePanelFilters = [
    keywords.trim(),
    sourceFilterActive,
    priceFilter !== "any",
    fromDate || toDate,
  ].filter(Boolean).length;
  const hasFilters = Boolean(
    search.trim() ||
      keywords.trim() ||
      sourceFilterActive ||
      priceFilter !== "any" ||
      fromDate ||
      toDate ||
      sort !== "freshness",
  );

  const sourceSummary =
    sourceFilterActive && selectedSources.length === 1
      ? selectedSources[0]
      : sourceFilterActive && selectedSources.length > 1
        ? `${selectedSources.length} источников`
        : "";
  const sourceMenuLabel = sourcesLoading ? "Загрузка..." : sourceFilterActive ? sourceSummary : "Все источники";

  const updateSources = (nextSources: string[]) => {
    const normalizedSources = Array.from(new Set(nextSources)).filter(Boolean);
    const isAllSelected =
      allSourceNames.length > 0 &&
      normalizedSources.length === allSourceNames.length &&
      allSourceNames.every((source) => normalizedSources.includes(source));

    if (normalizedSources.length === 0 || isAllSelected) {
      void setSourceParam("all");
      return;
    }

    void setSourceParam(normalizedSources.join(","));
  };

  const toggleSource = (source: string, checked: boolean) => {
    if (!checked && selectedSources.length <= 1) return;

    const nextSources = checked
      ? Array.from(new Set([...selectedSources, source]))
      : selectedSources.filter((item) => item !== source);

    updateSources(nextSources);
  };

  const clearFilters = () => {
    setSearch("");
    setKeywords("");
    void setSourceParam("all");
    setPriceFilter("any");
    setPriceFrom("");
    setPriceTo("");
    setCurrency("all");
    setFromDate("");
    setToDate("");
    setSort("freshness");
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Задания</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Загрузка..."
              : total > 0
                ? `${from}-${to} из ${total.toLocaleString("ru-RU")} заданий`
                : "Нет заданий"}
            {sourceSummary && ` · ${sourceSummary}`}
            {debouncedSearch && " · семантический поиск"}
            {debouncedKeywords && " · ключевые слова"}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <IconRefresh className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={cn("pl-10", search && "pr-9")}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Очистить поиск"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={(value) => setSort(value as SortValue)}>
          <SelectTrigger className="w-full lg:w-[210px]">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="freshness">Сначала новые</SelectItem>
            <SelectItem value="price_desc">Цена по убыванию</SelectItem>
            <SelectItem value="price_asc">Цена по возрастанию</SelectItem>
            <SelectItem value="relevance">Сначала релевантные</SelectItem>
          </SelectContent>
        </Select>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <IconMenu2 className="h-4 w-4" />
              Фильтры
              {activePanelFilters > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5">
                  {activePanelFilters}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[92vw] sm:max-w-md gap-0 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="text-lg">Фильтры</SheetTitle>
              <SheetDescription className="sr-only">Дополнительные параметры поиска заданий</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <section className="space-y-3">
                <Label htmlFor="keywords-filter">Ключевые слова</Label>
                <Input
                  id="keywords-filter"
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder={'"точная фраза" И (python ИЛИ django)'}
                />
              </section>

              <Separator />

              <section className="space-y-3">
                <Label htmlFor="price-filter">Цена</Label>
                <Select value={priceFilter} onValueChange={(value) => setPriceFilter(value as PriceFilter)}>
                  <SelectTrigger id="price-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRICE_FILTER_LABELS) as PriceFilter[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {PRICE_FILTER_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {priceFilter === "specified" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="price-from" className="text-xs text-muted-foreground">
                        Цена от
                      </Label>
                      <Input
                        id="price-from"
                        inputMode="numeric"
                        min={0}
                        type="number"
                        value={priceFrom}
                        onChange={(event) => setPriceFrom(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-to" className="text-xs text-muted-foreground">
                        Цена до
                      </Label>
                      <Input
                        id="price-to"
                        inputMode="numeric"
                        min={0}
                        type="number"
                        value={priceTo}
                        onChange={(event) => setPriceTo(event.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="currency-filter" className="text-xs text-muted-foreground">
                        Валюта
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-3">
                <Label>Дата публикации</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="from-date" className="text-xs text-muted-foreground">
                      От
                    </Label>
                    <Input
                      id="from-date"
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to-date" className="text-xs text-muted-foreground">
                      До
                    </Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <Label>Источники</Label>
                {sourcesLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        <span className="truncate">{sourceMenuLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedSources.length}/{allSourceNames.length}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {sources?.map((item) => {
                        const checked = selectedSources.includes(item.source);

                        return (
                          <DropdownMenuCheckboxItem
                            key={item.source}
                            checked={checked}
                            disabled={checked && selectedSources.length <= 1}
                            onCheckedChange={(nextChecked) => toggleSource(item.source, nextChecked)}
                            onSelect={(event) => event.preventDefault()}
                            className="gap-3"
                          >
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SOURCE_STYLES[item.source])}>
                              {item.source}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {item.total.toLocaleString("ru-RU")}
                            </span>
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </section>
            </div>

            <SheetFooter className="border-t p-4 sm:flex-row">
              <Button variant="outline" onClick={clearFilters} disabled={!hasFilters} className="sm:flex-1">
                Сбросить
              </Button>
              <SheetClose asChild>
                <Button className="sm:flex-1">Показать задания</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-1.5 shrink-0">
            <IconX className="h-4 w-4" />
            Сбросить
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} isSearch={isSearchMode} />
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
                <p className="text-muted-foreground mb-4">Попробуйте изменить запрос или фильтры</p>
                <Button variant="outline" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              </>
            ) : (
              <>
                <IconBriefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Задания не найдены</h3>
                <p className="text-muted-foreground">Запустите парсеры для загрузки заданий</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
