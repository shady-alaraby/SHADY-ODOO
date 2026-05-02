import { useGetSyncStatus, getGetSyncStatusQueryKey, useSyncOdoo } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw, Database, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Sync() {
  const token = useAuth(s => s.token);
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useGetSyncStatus(
    { query: { enabled: !!token, queryKey: getGetSyncStatusQueryKey(), refetchInterval: 10000 } }
  );

  const syncMutation = useSyncOdoo();

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast({ 
          title: res.success ? "Sync completed" : "Sync completed with errors",
          description: `Created: ${res.created} | Updated: ${res.updated} | Errors: ${res.errors}`
        });
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Sync failed", description: err.message, variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'error': return <AlertCircle className="text-destructive" size={16} />;
      case 'pending': return <RefreshCw className="text-primary animate-spin" size={16} />;
      default: return null;
    }
  };

  const latestLog = logs?.[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sync Status</h1>
          <p className="text-muted-foreground mt-1">Manage data synchronization with Odoo CRM.</p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={syncMutation.isPending || latestLog?.status === 'pending'}
          size="lg"
          className="gap-2"
        >
          <RefreshCw size={18} className={syncMutation.isPending || latestLog?.status === 'pending' ? "animate-spin" : ""} />
          Trigger Manual Sync
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Sync</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">
                {latestLog?.finishedAt 
                  ? formatDistanceToNow(new Date(latestLog.finishedAt), { addSuffix: true }) 
                  : "Never"}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="flex items-center gap-2 text-2xl font-bold capitalize">
                {latestLog ? getStatusIcon(latestLog.status) : null}
                {latestLog?.status || "Unknown"}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Records Processed</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">
                {latestLog ? (latestLog.created + latestLog.updated) : 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent synchronization jobs and their results.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24"><Skeleton className="h-8 w-full"/></TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No sync logs available.
                  </TableCell>
                </TableRow>
              ) : logs?.map((log) => {
                return (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2 font-medium capitalize">
                        {getStatusIcon(log.status)}
                        {log.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {format(new Date(log.startedAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {log.finishedAt ? format(new Date(log.finishedAt), "MMM d, HH:mm:ss") : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-500 font-bold">{log.created}</TableCell>
                    <TableCell className="text-right font-mono text-blue-500 font-bold">{log.updated}</TableCell>
                    <TableCell className="text-right font-mono text-destructive font-bold">{log.errors}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                      {log.message || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
