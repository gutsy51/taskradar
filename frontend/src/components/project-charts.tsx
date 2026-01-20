import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Мокированные данные для графиков
const uptimeData = [
  { date: "01.09", uptime: 99.9 },
  { date: "02.09", uptime: 99.8 },
  { date: "03.09", uptime: 99.7 },
  { date: "04.09", uptime: 98.5 },
  { date: "05.09", uptime: 99.9 },
  { date: "06.09", uptime: 99.9 },
  { date: "07.09", uptime: 100 },
  { date: "08.09", uptime: 99.6 },
  { date: "09.09", uptime: 99.8 },
  { date: "10.09", uptime: 99.9 },
  { date: "11.09", uptime: 99.7 },
  { date: "12.09", uptime: 99.9 },
  { date: "13.09", uptime: 100 },
  { date: "14.09", uptime: 99.8 },
];

const responseTimeData = [
  { time: "00:00", responseTime: 120 },
  { time: "01:00", responseTime: 115 },
  { time: "02:00", responseTime: 110 },
  { time: "03:00", responseTime: 125 },
  { time: "04:00", responseTime: 140 },
  { time: "05:00", responseTime: 135 },
  { time: "06:00", responseTime: 150 },
  { time: "07:00", responseTime: 180 },
  { time: "08:00", responseTime: 200 },
  { time: "09:00", responseTime: 220 },
  { time: "10:00", responseTime: 210 },
  { time: "11:00", responseTime: 195 },
  { time: "12:00", responseTime: 205 },
  { time: "13:00", responseTime: 190 },
  { time: "14:00", responseTime: 185 },
  { time: "15:00", responseTime: 175 },
  { time: "16:00", responseTime: 160 },
  { time: "17:00", responseTime: 155 },
  { time: "18:00", responseTime: 145 },
  { time: "19:00", responseTime: 140 },
  { time: "20:00", responseTime: 135 },
  { time: "21:00", responseTime: 130 },
  { time: "22:00", responseTime: 125 },
  { time: "23:00", responseTime: 120 },
];

const incidentsData = [
  { date: "Пн", incidents: 2 },
  { date: "Вт", incidents: 1 },
  { date: "Ср", incidents: 0 },
  { date: "Чт", incidents: 3 },
  { date: "Пт", incidents: 1 },
  { date: "Сб", incidents: 0 },
  { date: "Вс", incidents: 1 },
];

const uptimeConfig = {
  uptime: {
    label: "Время работы",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function UptimeChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Время работы за 14 дней</CardTitle>
        <CardDescription>
          Процент времени работы ваших мониторов
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={uptimeConfig} className="min-h-[300px] w-full">
          <AreaChart
            accessibilityLayer
            data={uptimeData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[95, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="uptime"
              type="natural"
              fill="var(--color-chart-1)"
              fillOpacity={0.4}
              stroke="var(--color-chart-1)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const responseTimeConfig = {
  responseTime: {
    label: "Время ответа",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ResponseTimeChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Время ответа за 24 часа</CardTitle>
        <CardDescription>Среднее время ответа в миллисекундах</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={responseTimeConfig}
          className="min-h-[300px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={responseTimeData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value} мс`}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="responseTime"
              type="monotone"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const incidentsConfig = {
  incidents: {
    label: "Инциденты",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function IncidentsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Инциденты за неделю</CardTitle>
        <CardDescription>Количество инцидентов по дням</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={incidentsConfig}
          className="min-h-[300px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={incidentsData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="incidents"
              fill="var(--color-chart-1)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
