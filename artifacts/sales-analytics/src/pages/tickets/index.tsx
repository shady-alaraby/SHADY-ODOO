import { useState } from "react";
import { useAuth, parseJwt } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { useListTickets, getListTicketsQueryKey, ListTicketsParams, ListTicketsTeamRole } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Search, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";

const STAGE_COLORS: Record<string, string> = {
  "New":         "text-chart-1 border-chart-1/35 bg-chart-1/10",
  "Qualified":   "text-chart-2 border-chart-2/35 bg-chart-2/10",
  "Proposition": "text-chart-4 border-chart-4/35 bg-chart-4/10",
  "Won":         "text-chart-3 border-chart-3/35 bg-chart-3/10",
  "Lost":        "text-destructive border-destructive/35 bg-destructive/10",
};

function ProbBadge({ prob }: { prob: number | null | undefined }) {
  if (!prob && prob !== 0) return <span className="text-muted-foreground">-</span>;
  const color = prob >= 80 ? "text-chart-3 bg-chart-3/10 border-chart-3/30"
    : prob >= 50 ? "text-chart-1 bg-chart-1/10 border-chart-1/30"
    : "text-destructive bg-destructive/10 border-destructive/30";
  return (
    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {prob}%
    </span>
  );
}

const STAGES = ["New", "Qualified", "Proposition", "Won", "Lost"];

const fmt = (v: number | null | undefined) =>
  !v ? "-" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

export default function Tickets() {
  const { t } = useI18n();
  const token = useAuth(s => s.token);
  const user = token ? parseJwt(token) : null;
  const isManager = user?.role === "BD" || user?.role === "TL" || user?.role === "ADMIN";

  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ListTicketsParams>({
    limit: 100,
    offset: 0,
    userId: isManager ? undefined : user?.userId,
  });

  const { data, isLoading } = useListTickets(
    { ...filters, search: search || undefined },
    { query: { enabled: !!token, queryKey: getListTicketsQueryKey({ ...filters, search: search || undefined }) } }
  );

  return (
    <div className="space-y-5 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-gold-gradient tracking-tight">{t("tickets")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("manageTickets")}</p>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 border border-border/60 p-1 rounded-lg">
          <Button
            variant={view === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            data-testid="button-view-table"
            className="h-7 px-3 gap-1.5 text-xs"
          >
            <List size={13} /> {t("table")}
          </Button>
          <Button
            variant={view === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
            data-testid="button-view-kanban"
            className="h-7 px-3 gap-1.5 text-xs"
          >
            <LayoutGrid size={13} /> {t("kanban")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card/60 backdrop-blur-sm border border-border/60 p-3 rounded-xl animate-fade-in-up delay-50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-9 bg-background/60 border-border/50 h-8 text-sm"
            data-testid="input-search"
          />
        </div>
        <Select value={filters.stage ?? "all"} onValueChange={v => setFilters(f => ({ ...f, stage: v === "all" ? undefined : v }))}>
          <SelectTrigger className="w-[130px] bg-background/60 border-border/50 h-8 text-sm" data-testid="select-stage">
            <SelectValue placeholder={t("allStages")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStages")}</SelectItem>
            {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={filters.teamRole ?? "all"} onValueChange={v => setFilters(f => ({ ...f, teamRole: v === "all" ? undefined : v as ListTicketsTeamRole }))}>
            <SelectTrigger className="w-[110px] bg-background/60 border-border/50 h-8 text-sm" data-testid="select-role">
              <SelectValue placeholder={t("anyRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("anyRole")}</SelectItem>
              <SelectItem value="BD">BD</SelectItem>
              <SelectItem value="TL">TL</SelectItem>
              <SelectItem value="TS">TS</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-[400px] animate-fade-in delay-100">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 skeleton-shimmer rounded-xl" />)}
          </div>
        ) : view === "table" ? (
          <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-auto">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("clientTicket")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("stage")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-end">{t("revenue")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{t("probability")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("salesperson")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tags")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("lastUpdated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.tickets.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{t("noTickets")}</TableCell>
                  </TableRow>
                ) : data.tickets.map((t_) => (
                  <TableRow key={t_.id} className="border-border/40 hover:bg-primary/5 transition-colors group">
                    <TableCell className="font-medium">
                      <Link href={`/tickets/${t_.id}`} className="text-primary hover:underline group-hover:text-primary/80">
                        {t_.clientName || "Unknown Client"}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{t_.email || t_.phone || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] border font-medium ${STAGE_COLORS[t_.stage] || ""}`}>
                        {t_.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-mono text-sm font-semibold text-foreground">
                      {fmt(t_.expectedRevenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ProbBadge prob={t_.probability} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t_.salesperson || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {t_.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] bg-chart-2/10 text-chart-2 border border-chart-2/20 px-1.5 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))}
                        {(t_.tags?.length || 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{t_.tags.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {t_.lastUpdate ? format(new Date(t_.lastUpdate), "MMM d, yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-4 items-start h-full">
            {STAGES.map(stage => {
              const stageTickets = data?.tickets.filter(t_ => t_.stage === stage) || [];
              const stageColor = STAGE_COLORS[stage] || "";
              return (
                <div
                  key={stage}
                  className="flex-none w-[300px] rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm flex flex-col max-h-[calc(100vh-260px)]"
                >
                  <div className={`px-4 py-3 flex justify-between items-center border-b border-border/40 rounded-t-xl bg-gradient-to-r from-transparent to-transparent`}>
                    <span className={`text-xs font-bold uppercase tracking-widest ${stageColor.split(' ')[0]}`}>{stage}</span>
                    <Badge variant="outline" className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${stageColor}`}>
                      {stageTickets.length}
                    </Badge>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-2.5">
                    {stageTickets.map(t_ => (
                      <Link key={t_.id} href={`/tickets/${t_.id}`}>
                        <Card className="card-glow cursor-pointer border-border/50 bg-card/80 group">
                          <CardContent className="p-3.5 space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {t_.clientName || "Unknown"}
                              </div>
                              <ProbBadge prob={t_.probability} />
                            </div>
                            <div className="text-xl font-bold font-mono text-primary tracking-tight">
                              {fmt(t_.expectedRevenue)}
                            </div>
                            {t_.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {t_.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[10px] bg-chart-2/10 text-chart-2 border border-chart-2/20 px-1.5 py-0.5 rounded-md">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[11px] text-muted-foreground border-t border-border/30 pt-2">
                              <span className="truncate max-w-[120px]">{t_.salesperson || "-"}</span>
                              <span>{t_.lastUpdate ? format(new Date(t_.lastUpdate), "MMM d") : "-"}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {!stageTickets.length && (
                      <p className="text-center text-xs text-muted-foreground italic py-6">{t("noTicketsInStage")}</p>
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
