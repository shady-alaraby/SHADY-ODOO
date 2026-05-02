import { useState } from "react";
import { useListMappings, getListMappingsQueryKey, useCreateMapping, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, parseJwt } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Mapping() {
  const token = useAuth(s => s.token);
  const currentUser = token ? parseJwt(token) : null;
  const isAdmin = currentUser?.role === "ADMIN";
  const queryClient = useQueryClient();

  const { data: mappings, isLoading: mappingsLoading } = useListMappings(
    { query: { enabled: !!token, queryKey: getListMappingsQueryKey() } }
  );

  const { data: users, isLoading: usersLoading } = useListUsers(
    { query: { enabled: !!token, queryKey: getListUsersQueryKey() } }
  );

  const createMapping = useCreateMapping();

  const [odooSalesperson, setOdooSalesperson] = useState("");
  const [localUserId, setLocalUserId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odooSalesperson || !localUserId) return;
    
    createMapping.mutate({
      data: {
        odooSalesperson,
        localUserId: parseInt(localUserId, 10)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Mapping created successfully" });
        setOdooSalesperson("");
        setLocalUserId("");
        queryClient.invalidateQueries({ queryKey: getListMappingsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error creating mapping", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Odoo User Mapping</h1>
        <p className="text-muted-foreground mt-1">Map Odoo salesperson names to local system users to enable role-based access.</p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><Link2 size={18}/> Create New Mapping</CardTitle>
            <CardDescription>Link an exact name from Odoo's 'salesperson' field to a local user.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Odoo Salesperson (Exact string)</label>
                <Input 
                  placeholder="e.g. John Doe" 
                  value={odooSalesperson} 
                  onChange={e => setOdooSalesperson(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Local User</label>
                <Select value={localUserId} onValueChange={setLocalUserId} required>
                  <SelectTrigger><SelectValue placeholder="Select user"/></SelectTrigger>
                  <SelectContent>
                    {users?.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createMapping.isPending} className="w-full sm:w-auto">
                <Plus className="mr-2" size={16}/> Map User
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Odoo Salesperson</TableHead>
              <TableHead>Local User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingsLoading || usersLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24"><Skeleton className="h-8 w-full"/></TableCell>
              </TableRow>
            ) : mappings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No mappings defined.
                </TableCell>
              </TableRow>
            ) : mappings?.map((m) => {
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium font-mono text-primary">{m.odooSalesperson}</TableCell>
                  <TableCell className="font-medium">{m.localUser?.name || "Unknown"}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-md font-semibold tracking-wide">
                      {m.localUser?.role || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(m.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
