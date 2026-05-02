import { useAuth, parseJwt } from "@/hooks/use-auth";
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
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { DollarSign, Briefcase, Activity, Target } from "lucide-react";

export default function Dashboard() {
  const token = useAuth(s => s.token);
  const user = token ? parseJwt(token) : null;
  const userId = user?.userId;
  const role = user?.role;
  const isManager = role === "TL" || role === "ADMIN";

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

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(val / 100);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your pipeline and performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Total Pipeline" 
          value={isLoadingSummary ? null : formatCurrency(summary?.totalPipelineValue || 0)} 
          icon={Briefcase}
          loading={isLoadingSummary}
        />
        <KpiCard 
          title="Weighted Revenue" 
          value={isLoadingSummary ? null : formatCurrency(summary?.weightedRevenue || 0)} 
          icon={DollarSign}
          loading={isLoadingSummary}
        />
        <KpiCard 
          title="Open Tickets" 
          value={isLoadingSummary ? null : summary?.openTickets?.toString() || "0"} 
          icon={Activity}
          loading={isLoadingSummary}
        />
        <KpiCard 
          title="Win Rate" 
          value={isLoadingSummary ? null : formatPercent(summary?.conversionRate || 0)} 
          icon={Target}
          loading={isLoadingSummary}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingStages ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : stages?.length ? (
              <ResponsiveContainer width="full" height="100%">
                <BarChart data={stages} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="stage" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Stage Distribution (Count)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingStages ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : stages?.length ? (
              <ResponsiveContainer width="full" height="100%">
                <PieChart>
                  <Pie
                    data={stages}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="stage"
                  >
                    {stages.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoadingPerf ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : performance?.length ? (
              <ResponsiveContainer width="full" height="100%">
                <BarChart data={performance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="userName" stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tickFormatter={(val) => `$${val/1000}k`} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val}%`} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalRevenue" name="Total Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="weightedRevenue" name="Weighted Revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Win Rate %" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, loading }: { title: string, value: string | null, icon: any, loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
