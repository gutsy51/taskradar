import { IconBriefcase, IconCurrencyRubel, IconDatabase } from "@tabler/icons-react";
import { useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { application } from "@/states/application";

const SOURCE_COLORS: Record<string, string> = {
  "fl.ru":           "bg-blue-500",
  "freelancejob.ru": "bg-green-500",
  "freelance.ru":    "bg-orange-500",
  "weblancer.net":   "bg-violet-500",
  "workzilla.com":   "bg-amber-500",
};

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}.${month}`;
}

function formatNumber(n: number) {
  return n.toLocaleString("ru-RU");
}

function StatCard({
  title,
  value,
  icon: Icon,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics();

  useEffect(() => {
    application.header = "Аналитика";
    return () => { application.header = undefined; };
  }, []);

  const noPrice = data ? data.total - data.with_price : 0;

  const chartData = (() => {
    if (!data?.by_date.length) return [];
    const maxDate = new Date(data.by_date[data.by_date.length - 1]!.date);
    const cutoff = new Date(maxDate);
    cutoff.setDate(cutoff.getDate() - 30);
    return data.by_date.filter((d) => new Date(d.date) >= cutoff);
  })();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Аналитика</h1>
        <p className="text-muted-foreground">Статистика собранных заданий</p>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Всего заданий"
              value={formatNumber(data?.total ?? 0)}
              icon={IconBriefcase}
              sub={`из ${data?.by_source.length ?? 0} источников`}
            />
            <StatCard
              title="С указанной ценой"
              value={formatNumber(data?.with_price ?? 0)}
              icon={IconCurrencyRubel}
              sub={`${data?.total ? Math.round((data.with_price / data.total) * 100) : 0}% от общего`}
            />
            <StatCard
              title="Без цены"
              value={formatNumber(noPrice)}
              icon={IconDatabase}
              sub="договорённость или не указана"
            />
          </>
        )}
      </div>

      {/* График по дате публикации */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Задания по дате публикации</CardTitle>
          <span className="text-xs text-muted-foreground">последние 30 дней</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), "Заданий"]}
                  labelFormatter={(label) => `Дата: ${label}`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: "var(--radius)",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* По источникам */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">По источникам</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.by_source.map((s) => (
                <div key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.source}</span>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {s.avg_price != null && (
                        <span>ср. {formatNumber(s.avg_price)} ₽</span>
                      )}
                      <span className="font-medium text-foreground">{formatNumber(s.count)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", SOURCE_COLORS[s.source] ?? "bg-gray-400")}
                      style={{ width: `${(s.count / (data?.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
