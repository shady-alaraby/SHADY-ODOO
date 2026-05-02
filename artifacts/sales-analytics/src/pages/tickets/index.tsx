import { useState } from "react";
import { useAuth, parseJwt } from "@/hooks/use-auth";
import { useListTickets, getListTicketsQueryKey, ListTicketsParams, ListTicketsTeamRole } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Search, Filter, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";

export default function Tickets() {
  const token = useAuth(s => s.token);
  const user = token ? parseJwt(token) : null;
  const isManager = user?.role === "TL" || user?.role === "ADMIN";

  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ListTicketsParams>({
    limit: 50,
    offset: 0,
    userId: isManager ? undefined : user?.userId,
  });

  const { data, isLoading } = useListTickets(
    { ...filters, search: search || undefined },
    { query: { enabled: !!token, queryKey: getListTicketsQueryKey({ ...filters, search: search || undefined }) } }
  );

  const formatCurrency = (val: number | null | undefined) => {
    if (!val) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const getProbabilityColor = (prob: number | null | undefined) => {
    if (!prob) return "bg-muted";
    if (prob >= 80) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (prob >= 50) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/20 text-red-700 dark:text-red-400";
  };

  const stages = ["New", "Qualified", "Proposition", "Won", "Lost"]; // Fallback, could be dynamic

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage and track your pipeline opportunities.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-md flex items-center">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("table")}
              data-testid="button-view-table"
              className="h-8 px-2"
            >
              <List size={16} className="mr-2" />
              Table
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
              data-testid="button-view-kanban"
              className="h-8 px-2"
            >
              <LayoutGrid size={16} className="mr-2" />
              Kanban
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search client, ticket, phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={filters.stage} onValueChange={(v) => setFilters(f => ({ ...f, stage: v === "all" ? undefined : v }))}>
            <SelectTrigger className="w-[140px]" data-testid="select-stage">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {isManager && (
            <Select value={filters.teamRole} onValueChange={(v) => setFilters(f => ({ ...f, teamRole: v === "all" ? undefined : v as ListTicketsTeamRole }))}>
              <SelectTrigger className="w-[140px]" data-testid="select-role">
                <SelectValue placeholder="Any Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Role</SelectItem>
                <SelectItem value="BD">BD</SelectItem>
                <SelectItem value="TL">TL</SelectItem>
                <SelectItem value="TS">TS</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : view === "table" ? (
          <div className="rounded-md border border-border bg-card overflow-auto h-full">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Client / Ticket</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-center">Prob %</TableHead>
                  <TableHead>Salesperson</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No tickets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.tickets.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <Link href={`/tickets/${t.id}`} className="text-primary hover:underline">
                          {t.clientName || "Unknown Client"}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{t.email || t.phone || "No contact info"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{t.stage}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(t.expectedRevenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`font-mono ${getProbabilityColor(t.probability)}`} variant="secondary">
                          {t.probability ? `${t.probability}%` : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.salesperson || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {(t.tags?.length || 0) > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{t.tags.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {t.lastUpdate ? format(new Date(t.lastUpdate), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
            {stages.map(stage => {
              const stageTickets = data?.tickets.filter(t => t.stage === stage) || [];
              return (
                <div key={stage} className="bg-muted/30 border border-border rounded-lg min-w-[320px] w-[320px] flex flex-col h-full max-h-full">
                  <div className="p-3 border-b border-border font-semibold flex justify-between items-center bg-card/50 rounded-t-lg">
                    <span>{stage}</span>
                    <Badge variant="secondary" className="font-mono">{stageTickets.length}</Badge>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {stageTickets.map(t => (
                      <Link key={t.id} href={`/tickets/${t.id}`}>
                        <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md hover:shadow-primary/5 group">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold truncate pr-2 group-hover:text-primary transition-colors">{t.clientName || "Unknown"}</div>
                              <Badge className={`font-mono text-xs ${getProbabilityColor(t.probability)}`} variant="secondary">
                                {t.probability || 0}%
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold font-mono tracking-tight text-primary/90">
                              {formatCurrency(t.expectedRevenue)}
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border pt-2">
                              <span>{t.salesperson || "-"}</span>
                              <span>{t.lastUpdate ? format(new Date(t.lastUpdate), "MMM d") : "-"}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {stageTickets.length === 0 && (
                      <div className="text-center p-4 text-sm text-muted-foreground italic">No tickets in this stage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
