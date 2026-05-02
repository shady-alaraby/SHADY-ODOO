import { useParams } from "wouter";
import { useState, useRef, useEffect } from "react";
import { 
  useGetTicket, 
  getGetTicketQueryKey, 
  useUpdateTicket, 
  useListActivities, 
  getListActivitiesQueryKey,
  useCreateActivity,
  CreateActivityBodyType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Phone, Mail, Clock, Calendar, CheckSquare, MessageSquare,
  Briefcase, Plus, Hash, ExternalLink, User, TrendingUp, DollarSign
} from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  "New":         "text-chart-1 border-chart-1/40 bg-chart-1/10",
  "Qualified":   "text-chart-2 border-chart-2/40 bg-chart-2/10",
  "Proposition": "text-chart-4 border-chart-4/40 bg-chart-4/10",
  "Won":         "text-chart-3 border-chart-3/40 bg-chart-3/10",
  "Lost":        "text-destructive border-destructive/40 bg-destructive/10",
};

export default function TicketDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const { data: ticket, isLoading } = useGetTicket(id, { 
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id) } 
  });

  const { data: activities, isLoading: isActivitiesLoading } = useListActivities(
    { ticketId: id },
    { query: { enabled: !!id, queryKey: getListActivitiesQueryKey({ ticketId: id }) } }
  );

  const updateMutation = useUpdateTicket();
  const createActivity = useCreateActivity();

  const [note, setNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [actType, setActType] = useState<CreateActivityBodyType>("note");
  const [actSummary, setActSummary] = useState("");
  const [actDate, setActDate] = useState("");

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (ticket && initializedForId.current !== ticket.id) {
      setNote(ticket.internalNote || "");
      setTags(ticket.tags || []);
      initializedForId.current = ticket.id;
    }
  }, [ticket]);

  const handleSaveNote = () => {
    updateMutation.mutate({ id, data: { internalNote: note } }, {
      onSuccess: (data) => {
        toast({ title: t("noteSaved") });
        queryClient.setQueryData(getGetTicketQueryKey(id), (old: unknown) =>
          old && typeof old === 'object' ? { ...(old as object), internalNote: (data as { internalNote: string }).internalNote } : old
        );
      }
    });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      const tag = newTag.trim();
      if (!tags.includes(tag)) {
        const newTags = [...tags, tag];
        setTags(newTags);
        setNewTag("");
        updateMutation.mutate({ id, data: { tags: newTags } }, {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetTicketQueryKey(id), (old: unknown) =>
              old && typeof old === 'object' ? { ...(old as object), tags: (data as { tags: string[] }).tags } : old
            );
          }
        });
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    updateMutation.mutate({ id, data: { tags: newTags } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetTicketQueryKey(id), (old: unknown) =>
          old && typeof old === 'object' ? { ...(old as object), tags: (data as { tags: string[] }).tags } : old
        );
      }
    });
  };

  const handleAddActivity = () => {
    if (!actType || !actDate) return;
    createActivity.mutate({
      data: { ticketId: id, type: actType, summary: actSummary, doneAt: new Date(actDate).toISOString() }
    }, {
      onSuccess: () => {
        toast({ title: t("activityLogged") });
        setActSummary("");
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ ticketId: id }) });
      }
    });
  };

  const fmtCurrency = (val: number | null | undefined) =>
    !val ? "-" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3 skeleton-shimmer" />
        <Skeleton className="h-64 w-full skeleton-shimmer" />
      </div>
    );
  }

  if (!ticket) return <div className="text-muted-foreground text-center py-16">{t("ticketNotFound")}</div>;

  const stageColor = STAGE_COLORS[ticket.stage] || "";
  // Cast to access new fields (schema extended, types regenerate on next codegen)
  const ticketExt = ticket as typeof ticket & {
    title?: string | null;
    contactName?: string | null;
    odooUrl?: string | null;
    odooSalespersonName?: string | null;
    lastOdooUpdate?: string | null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-5">

        {/* Header */}
        <div className="animate-fade-in-up">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className={`font-medium border ${stageColor}`}>{ticket.stage}</Badge>
            {(ticket.probability !== null && ticket.probability !== undefined) && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono">
                {ticket.probability}%
              </Badge>
            )}
            {ticketExt.odooUrl && (
              <a
                href={ticketExt.odooUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-open-in-odoo"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-chart-2/40 text-chart-2 hover:bg-chart-2/10 hover:border-chart-2/60 transition-all"
                >
                  <ExternalLink size={12} />
                  {t("openInOdoo")}
                </Button>
              </a>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {ticketExt.title || ticket.clientName}
          </h1>
          {ticketExt.title && ticketExt.title !== ticket.clientName && (
            <p className="text-muted-foreground text-sm mt-0.5">{ticket.clientName}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {ticket.email && (
              <a href={`mailto:${ticket.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Mail size={13}/> {ticket.email}
              </a>
            )}
            {ticket.phone && (
              <a href={`tel:${ticket.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Phone size={13}/> {ticket.phone}
              </a>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up delay-50">
          <div className="card-glow border border-border/60 bg-card/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
              <DollarSign size={12}/> {t("revenue")}
            </div>
            <div className="text-xl font-bold font-mono text-primary">{fmtCurrency(ticket.expectedRevenue)}</div>
          </div>
          <div className="card-glow border border-border/60 bg-card/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
              <TrendingUp size={12}/> {t("probability")}
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{ticket.probability ?? 0}%</div>
          </div>
          <div className="card-glow border border-border/60 bg-card/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
              <User size={12}/> {t("salesperson")}
            </div>
            <div className="text-sm font-semibold text-foreground truncate">
              {ticketExt.odooSalespersonName || ticket.salesperson || "-"}
            </div>
          </div>
          <div className="card-glow border border-border/60 bg-card/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
              <Calendar size={12}/> {t("created")}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {ticket.createDate ? format(new Date(ticket.createDate), "MMM d, yyyy") : "-"}
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        <Card className="glass border-border/60 animate-fade-in-up delay-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare size={16} className="text-primary"/> {t("internalNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[130px] font-mono text-sm resize-y bg-background/60"
              placeholder={t("addNotes")}
            />
            <Button onClick={handleSaveNote} disabled={updateMutation.isPending} size="sm" className="gap-2">
              {updateMutation.isPending ? t("saving") : t("saveNote")}
            </Button>
          </CardContent>
        </Card>

        {/* Log Activity */}
        <Card className="glass border-border/60 animate-fade-in-up delay-150">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase size={16} className="text-primary"/> {t("logActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select value={actType} onValueChange={(v) => setActType(v as CreateActivityBodyType)}>
                    <SelectTrigger className="bg-background/60"><SelectValue placeholder={t("activityType")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">{t("note")}</SelectItem>
                      <SelectItem value="call">{t("call")}</SelectItem>
                      <SelectItem value="meeting">{t("meeting")}</SelectItem>
                      <SelectItem value="email">{t("email")}</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input type="datetime-local" value={actDate} onChange={e => setActDate(e.target.value)} className="bg-background/60"/>
                </div>
              </div>
              <Input 
                placeholder={t("activitySummary")}
                value={actSummary} 
                onChange={e => setActSummary(e.target.value)} 
                className="bg-background/60"
              />
              <Button onClick={handleAddActivity} disabled={createActivity.isPending} className="self-end gap-2">
                {createActivity.isPending ? t("logging") : t("logActivity")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Column */}
      <div className="space-y-5">
        {/* Odoo Info */}
        {(ticketExt.odooUrl || ticket.odooId) && (
          <Card className="glass border-chart-2/30 animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-chart-2">
                <ExternalLink size={16}/> Odoo CRM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Lead ID</span>
                  <span className="font-mono text-xs text-foreground">#{ticket.odooId}</span>
                </div>
                {ticketExt.lastOdooUpdate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">{t("lastUpdated")}</span>
                    <span className="text-xs text-foreground">{format(new Date(ticketExt.lastOdooUpdate), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
              {ticketExt.odooUrl && (
                <a href={ticketExt.odooUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" size="sm" className="w-full gap-2 border-chart-2/40 text-chart-2 hover:bg-chart-2/10">
                    <ExternalLink size={13}/> {t("openInOdoo")}
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        <Card className="glass border-border/60 animate-fade-in-up delay-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Hash size={16} className="text-primary"/>{t("tags")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/10 text-primary border border-primary/20">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ms-1">×</button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input 
                value={newTag} 
                onChange={e => setNewTag(e.target.value)} 
                onKeyDown={handleAddTag}
                placeholder={t("addTag")}
                className="ps-8 bg-background/60"
              />
              <Plus className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="glass border-border/60 animate-fade-in-up delay-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Clock size={16} className="text-primary"/>{t("timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ms-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {isActivitiesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full skeleton-shimmer" />
                  <Skeleton className="h-14 w-full skeleton-shimmer" />
                </div>
              ) : !activities?.length ? (
                <div className="text-center text-muted-foreground text-sm italic relative z-10 py-4">{t("noActivities")}</div>
              ) : (
                activities.map((act) => {
                  let Icon = CheckSquare;
                  if (act.type === 'call') Icon = Phone;
                  if (act.type === 'email') Icon = Mail;
                  if (act.type === 'meeting') Icon = Calendar;
                  if (act.type === 'whatsapp') Icon = MessageSquare;

                  return (
                    <div key={act.id} className="relative flex items-start gap-3 group">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-card bg-primary text-primary-foreground shrink-0 shadow-sm shadow-primary/20 z-10">
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 bg-card/80 border border-border/60 p-3 rounded-xl">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-semibold text-xs uppercase tracking-wider text-primary capitalize">{act.type}</div>
                          <time className="font-mono text-[10px] text-muted-foreground">{format(new Date(act.doneAt), "MMM d, h:mm a")}</time>
                        </div>
                        <div className="text-sm text-foreground/80">{act.summary || t("noDetails")}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
