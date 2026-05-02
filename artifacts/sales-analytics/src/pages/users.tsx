import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, CreateUserBodyRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, parseJwt } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Crown, Users2, User, Filter } from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Admin", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  BD:    { label: "BD",    color: "text-chart-1",     bg: "bg-chart-1/10 border-chart-1/30" },
  TL:    { label: "TL",   color: "text-chart-2",     bg: "bg-chart-2/10 border-chart-2/30" },
  TS:    { label: "TS",   color: "text-chart-3",     bg: "bg-chart-3/10 border-chart-3/30" },
};

function UserAvatar({ name, role }: { name: string; role: string }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.TS;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
      {initials}
    </div>
  );
}

export default function Users() {
  const { t } = useI18n();
  const token = useAuth(s => s.token);
  const currentUser = token ? parseJwt(token) : null;
  const isAdmin = currentUser?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterBD, setFilterBD] = useState<string>("all");

  const { data: users, isLoading } = useListUsers({
    query: { enabled: !!token, queryKey: getListUsersQueryKey() }
  });

  const createUser = useCreateUser();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "", email: "", name: "", password: "",
    role: "TS" as CreateUserBodyRole, managerId: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({
      data: { ...formData, managerId: formData.managerId ? parseInt(formData.managerId, 10) : undefined }
    }, {
      onSuccess: () => {
        toast({ title: t("createUser") + " ✓" });
        setIsOpen(false);
        setFormData({ username: "", email: "", name: "", password: "", role: "TS", managerId: "" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const bds = (users || []).filter(u => u.role === 'BD');

  const filtered = (users || []).filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    if (filterBD === "all" || !matchRole) return matchSearch && matchRole;
    // Filter by BD: user is the BD, or their manager is the BD, or their manager's manager is the BD
    const bd = users?.find(x => x.id.toString() === filterBD);
    if (!bd) return matchSearch && matchRole;
    if (u.id.toString() === filterBD) return matchSearch && matchRole;
    const directUnderBD = users?.filter(x => x.managerId === bd.id).map(x => x.id) || [];
    const allUnder = [...directUnderBD];
    for (const tlId of directUnderBD) {
      const tsUnderTL = (users || []).filter(x => x.managerId === tlId).map(x => x.id);
      allUnder.push(...tsUnderTL);
    }
    return matchSearch && matchRole && (allUnder.includes(u.id) || u.id === bd.id);
  });

  const grouped = {
    ADMIN: filtered.filter(u => u.role === 'ADMIN'),
    BD:    filtered.filter(u => u.role === 'BD'),
    TL:    filtered.filter(u => u.role === 'TL'),
    TS:    filtered.filter(u => u.role === 'TS'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-gold-gradient tracking-tight">{t("users")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("manageTeam")}</p>
        </div>
        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md shadow-primary/20" data-testid="button-create-user">
                <Plus size={16} /> {t("addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/60">
              <DialogHeader>
                <DialogTitle className="text-gold-gradient">{t("createUser")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {[
                  { label: t("name"),     key: "name",     type: "text" },
                  { label: t("username"), key: "username", type: "text" },
                  { label: t("email"),    key: "email",    type: "email" },
                  { label: t("password"), key: "password", type: "password" },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-sm font-medium">{f.label}</label>
                    <Input
                      type={f.type}
                      value={(formData as any)[f.key]}
                      onChange={e => setFormData(fd => ({ ...fd, [f.key]: e.target.value }))}
                      required
                      className="bg-background/60"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("role")}</label>
                  <Select value={formData.role} onValueChange={(v: CreateUserBodyRole) => setFormData(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BD">{t("businessDeveloper")}</SelectItem>
                      <SelectItem value="TL">{t("teamLeader")}</SelectItem>
                      <SelectItem value="TS">{t("technicalSales")}</SelectItem>
                      <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("manager")}</label>
                  <Select value={formData.managerId} onValueChange={v => setFormData(f => ({ ...f, managerId: v }))}>
                    <SelectTrigger className="bg-background/60"><SelectValue placeholder={t("none")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("none")}</SelectItem>
                      {(users || []).filter(u => u.role === 'BD' || u.role === 'TL' || u.role === 'ADMIN').map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createUser.isPending} className="w-full">
                    {createUser.isPending ? t("creating") : t("createUser")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-fade-in-up delay-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-9 bg-card/60 border-border/60"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[140px] bg-card/60 border-border/60">
            <Filter size={14} className="me-2 text-muted-foreground" />
            <SelectValue placeholder={t("role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyRole")}</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="BD">BD</SelectItem>
            <SelectItem value="TL">TL</SelectItem>
            <SelectItem value="TS">TS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBD} onValueChange={setFilterBD}>
          <SelectTrigger className="w-[160px] bg-card/60 border-border/60">
            <SelectValue placeholder={t("businessDevelopers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("businessDevelopers")} ({t("allStages").replace('All ', '')})</SelectItem>
            {bds.map(bd => (
              <SelectItem key={bd.id} value={bd.id.toString()}>{bd.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User Cards by Group */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl skeleton-shimmer" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {(['ADMIN', 'BD', 'TL', 'TS'] as const).map(role => {
            const group = grouped[role];
            if (!group.length) return null;
            const cfg = ROLE_CONFIG[role];
            const roleLabels: Record<string, string> = { ADMIN: 'Admin', BD: t("businessDevelopers"), TL: t("teamLeaders"), TS: t("employees") };
            return (
              <div key={role} className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className={`text-sm font-bold uppercase tracking-wider ${cfg.color}`}>{roleLabels[role]}</h2>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{group.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.map((u, i) => {
                    const manager = u.managerId ? users?.find(x => x.id === u.managerId) : null;
                    return (
                      <div
                        key={u.id}
                        className="card-glow border border-border/60 bg-card/60 backdrop-blur-sm rounded-xl p-4 space-y-3 animate-fade-in-up"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} role={u.role} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">{u.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          {manager && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              ↑ {manager.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">{t("noData")}</div>
          )}
        </div>
      )}
    </div>
  );
}
