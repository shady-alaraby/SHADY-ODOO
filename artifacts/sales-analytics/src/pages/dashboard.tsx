import { useAuth, parseJwt } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import {
  useGetDashboardSummary,
  useGetStageDistribution,
  useGetPerformanceByUser,
  getGetDashboardSummaryQueryKey,
  getGetStageDistributionQueryKey,
  getGetPerformanceByUserQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { DollarSign, Briefcase, Activity, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return count;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function GoldTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 border border-primary/20 shadow-xl text-sm">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-bold">{typeof p.value === 'number' && p.value > 100
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.value)
            : p.value
          }</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const token = useAuth(s => s.token);
  const user = token ? parseJwt(token) : null;
  const userId = user?.userId;
  const role = user?.role;
  const isManager = role === "BD" || role === "TL" || role === "ADMIN";

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(
    { userId: isManager ? undefined : userId },
    { query: { enabled: !!token, queryKey: getGetDashboardSummaryQueryKey({ userId: isManager ? undefined : userId }) } }
  );

  const { data: stages, isLoading: isLoadingStages } = useGetStageDistribution(
    { userId: isManager ? undefined : userId },
    { query: { enabled: !!token, queryKey: getGetStageDistributionQueryKey({ userId: isManager ? undefined : userId }) } }
  );

  const { data: performance, isLoading: isLoadingPerf } = useGetPerformanceByUser(
    { managerId: role === "TL" ? userId : undefined },
    { query: { enabled: isManager && !!token, queryKey: getGetPerformanceByUserQueryKey({ managerId: role === "TL" ? userId : undefined }) } }
  );

  const pipeline = summary?.totalPipelineValue || 0;
  const weighted = summary?.weightedRevenue || 0;
  const openCount = summary?.openTickets || 0;
  const winRate = summary?.conversionRate || 0;

  const animPipeline = useCountUp(pipeline);
  const animWeighted = useCountUp(weighted);
  const animOpen = useCountUp(openCount);
  const animWin = useCountUp(winRate * 10) / 10;

  const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const kpis = [
    { title: t("totalPipeline"),    value: isLoadingSummary ? null : fmt(animPipeline),        icon: Briefcase,  delay: 0   },
    { title: t("weightedRevenue"),  value: isLoadingSummary ? null : fmt(animWeighted),         icon: DollarSign, delay: 80  },
    { title: t("openTickets"),      value: isLoadingSummary ? null : animOpen.toString(),       icon: Activity,   delay: 160 },
    { title: t("winRate"),          value: isLoadingSummary ? null : `${animWin.toFixed(1)}%`, icon: Target,     delay: 240 },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gold-gradient tracking-tight">{t("dashboard")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("overview")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ title, value, icon: Icon, delay }) => (
          <div key={title} className="animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
            <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {value === null ? (
                  <Skeleton className="h-8 w-28 skeleton-shimmer" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">{value}</div>
                )}
                <div className="mt-1 h-0.5 w-12 bg-gradient-to-r from-primary to-transparent rounded-full" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 animate-fade-in-up delay-200">
        <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">{t("pipelineByStage")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isLoadingStages ? (
              <Skeleton className="w-full h-full skeleton-shimmer rounded-md" />
            ) : stages?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stages} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGold" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="stage" type="category" width={90} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip content={<GoldTooltip />} />
                  <Bar dataKey="totalRevenue" fill="url(#barGold)" radius={[0, 6, 6, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("noData")}</div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">{t("stageDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isLoadingStages ? (
              <Skeleton className="w-full h-full skeleton-shimmer rounded-md" />
            ) : stages?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stages}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="stage"
                    strokeWidth={0}
                  >
                    {stages.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip content={<GoldTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("noData")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      {isManager && (
        <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm animate-fade-in-up delay-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">{t("teamPerformance")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            {isLoadingPerf ? (
              <Skeleton className="w-full h-full skeleton-shimmer rounded-md" />
            ) : performance?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                  <defs>
                    <linearGradient id="barTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="barWeighted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="userName" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `$${v/1000}k`} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip content={<GoldTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="totalRevenue" name="Total Revenue" fill="url(#barTotal)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="weightedRevenue" name="Weighted" fill="url(#barWeighted)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Win %" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--chart-3))', r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("noData")}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
