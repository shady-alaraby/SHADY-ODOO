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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Phone, Mail, Clock, Calendar, CheckSquare, MessageSquare, Briefcase, Plus, Hash } from "lucide-react";

export default function TicketDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();

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
        toast({ title: "Note saved" });
        queryClient.setQueryData(getGetTicketQueryKey(id), (old: any) => old ? { ...old, internalNote: data.internalNote } : old);
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
            queryClient.setQueryData(getGetTicketQueryKey(id), (old: any) => old ? { ...old, tags: data.tags } : old);
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
        queryClient.setQueryData(getGetTicketQueryKey(id), (old: any) => old ? { ...old, tags: data.tags } : old);
      }
    });
  };

  const handleAddActivity = () => {
    if (!actType || !actDate) return;
    createActivity.mutate({
      data: {
        ticketId: id,
        type: actType,
        summary: actSummary,
        doneAt: new Date(actDate).toISOString()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Activity logged" });
        setActSummary("");
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ ticketId: id }) });
      }
    });
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (!val) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  if (isLoading) {
    return <div className="space-y-4 p-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-8">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-sm font-medium py-1">{ticket.stage}</Badge>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30" variant="secondary">
              {ticket.probability || 0}% Probability
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{ticket.clientName}</h1>
          <p className="text-muted-foreground flex items-center gap-4 mt-2 text-sm">
            {ticket.email && <span className="flex items-center gap-1"><Mail size={14}/> {ticket.email}</span>}
            {ticket.phone && <span className="flex items-center gap-1"><Phone size={14}/> {ticket.phone}</span>}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Expected Revenue</span>
              <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(ticket.expectedRevenue)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Salesperson</span>
              <span className="text-lg font-medium">{ticket.salesperson || "-"}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Created</span>
              <span className="text-lg font-medium">{ticket.createDate ? format(new Date(ticket.createDate), "MMM d, yyyy") : "-"}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Last Update</span>
              <span className="text-lg font-medium">{ticket.lastUpdate ? format(new Date(ticket.lastUpdate), "MMM d, yyyy") : "-"}</span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare size={18}/> Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[150px] font-mono text-sm resize-y bg-background"
              placeholder="Add internal notes about this ticket..."
            />
            <Button onClick={handleSaveNote} disabled={updateMutation.isPending} size="sm">
              {updateMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Briefcase size={18}/> Log Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={actType} onValueChange={(v) => setActType(v as CreateActivityBodyType)}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input type="datetime-local" value={actDate} onChange={e => setActDate(e.target.value)} />
                </div>
              </div>
              <Input 
                placeholder="Summary or details..." 
                value={actSummary} 
                onChange={e => setActSummary(e.target.value)} 
              />
              <Button onClick={handleAddActivity} disabled={createActivity.isPending} className="self-end">
                Log Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Column */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Hash size={18}/> Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ml-1">×</button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input 
                value={newTag} 
                onChange={e => setNewTag(e.target.value)} 
                onKeyDown={handleAddTag}
                placeholder="Add tag and press enter..."
                className="pl-8"
              />
              <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Clock size={18}/> Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {isActivitiesLoading ? (
                <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : activities?.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm italic relative z-10 bg-card py-2">No activities logged yet</div>
              ) : (
                activities?.map((act) => {
                  let Icon = CheckSquare;
                  if (act.type === 'call') Icon = Phone;
                  if (act.type === 'email') Icon = Mail;
                  if (act.type === 'meeting') Icon = Calendar;
                  if (act.type === 'whatsapp') Icon = MessageSquare;

                  return (
                    <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-primary-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                        <Icon size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border p-4 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-sm capitalize">{act.type}</div>
                          <time className="font-mono text-xs text-muted-foreground">{format(new Date(act.doneAt), "MMM d, h:mm a")}</time>
                        </div>
                        <div className="text-sm text-foreground/80">{act.summary || "No details provided"}</div>
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
