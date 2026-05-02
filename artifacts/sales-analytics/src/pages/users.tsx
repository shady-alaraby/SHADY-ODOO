import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, CreateUserBodyRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, parseJwt } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Users as UsersIcon } from "lucide-react";

export default function Users() {
  const token = useAuth(s => s.token);
  const currentUser = token ? parseJwt(token) : null;
  const isAdmin = currentUser?.role === "ADMIN";
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers(
    { query: { enabled: !!token, queryKey: getListUsersQueryKey() } }
  );

  const createUser = useCreateUser();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    role: "BD" as CreateUserBodyRole,
    managerId: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({
      data: {
        ...formData,
        managerId: formData.managerId ? parseInt(formData.managerId, 10) : undefined
      }
    }, {
      onSuccess: () => {
        toast({ title: "User created successfully" });
        setIsOpen(false);
        setFormData({ username: "", name: "", password: "", role: "BD", managerId: "" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error creating user", description: err.message, variant: "destructive" });
      }
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-destructive/20 text-destructive';
      case 'TL': return 'bg-primary/20 text-primary';
      case 'BD': return 'bg-blue-500/20 text-blue-500';
      case 'TS': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage team members and their roles.</p>
        </div>
        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user"><Plus className="mr-2" size={16}/> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input value={formData.username} onChange={e => setFormData(f => ({...f, username: e.target.value}))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" value={formData.password} onChange={e => setFormData(f => ({...f, password: e.target.value}))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={formData.role} onValueChange={(v: CreateUserBodyRole) => setFormData(f => ({...f, role: v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BD">Business Development (BD)</SelectItem>
                      <SelectItem value="TL">Team Lead (TL)</SelectItem>
                      <SelectItem value="TS">Technical Sales (TS)</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Manager</label>
                  <Select value={formData.managerId} onValueChange={v => setFormData(f => ({...f, managerId: v}))}>
                    <SelectTrigger><SelectValue placeholder="None"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {users?.filter(u => u.role === 'TL' || u.role === 'ADMIN').map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24"><Skeleton className="h-8 w-full"/></TableCell>
              </TableRow>
            ) : users?.map((u) => {
              const manager = u.managerId ? users.find(x => x.id === u.managerId) : null;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    {u.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-bold tracking-wider ${getRoleColor(u.role)} border-transparent`}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{manager ? manager.name : <span className="text-muted-foreground italic">None</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
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
