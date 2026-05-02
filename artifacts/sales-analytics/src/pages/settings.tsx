import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { User, Shield, Calendar, Key } from "lucide-react";

export default function Settings() {
  const token = useAuth(s => s.token);
  
  const { data: user, isLoading } = useGetMe(
    { query: { enabled: !!token, queryKey: getGetMeQueryKey() } }
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your personal details and role within the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : user ? (
            <>
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <p className="text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Shield size={16} /> System Role
                  </div>
                  <div className="font-medium">
                    <Badge variant="secondary" className="px-2 py-1 text-sm tracking-wide">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1 p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User size={16} /> User ID
                  </div>
                  <div className="font-mono text-lg font-medium">{user.id}</div>
                </div>

                <div className="space-y-1 p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar size={16} /> Member Since
                  </div>
                  <div className="font-medium text-lg">{format(new Date(user.createdAt), "MMMM d, yyyy")}</div>
                </div>

                <div className="space-y-1 p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Key size={16} /> Security
                  </div>
                  <div className="font-medium text-primary">Password active</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground italic">Failed to load profile.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
