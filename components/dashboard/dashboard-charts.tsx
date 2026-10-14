"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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

export type TrendPoint = { date: string; label: string; leads: number };
export type StatusSlice = { name: string; count: number; color: string };
export type SourceBar = { name: string; count: number };

const CHART_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
];

/** Custom dark-aware tooltip for area/bar charts. */
function ChartTooltip({
  active,
  payload,
  label,
  suffix = "leads",
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-1.5 text-xs shadow-lg">
      <div className="font-medium">{label ?? payload[0].name}</div>
      <div className="text-muted-foreground">
        {payload[0].value} {suffix}
      </div>
    </div>
  );
}

export function LeadsTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>New leads — last 30 days</CardTitle>
        <CardDescription>Daily intake across all sources.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#trendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline mix</CardTitle>
        <CardDescription>
          {total.toLocaleString("en-IN")} leads in {data.length} statuses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold">
              {total.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted-foreground">total leads</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.slice(0, 7).map((slice) => (
            <span key={slice.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="max-w-28 truncate">{slice.name}</span>
              <span className="text-muted-foreground">{slice.count}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SourcesBarChart({ data }: { data: SourceBar[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top sources</CardTitle>
        <CardDescription>Where leads are coming from.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#88888810" }} />
              <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={18}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
