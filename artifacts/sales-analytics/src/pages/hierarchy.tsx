import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ChevronDown, ChevronRight, Users2, User, Crown } from "lucide-react";

type UserItem = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  managerId?: number | null;
};

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any; order: number }> = {
  ADMIN: { label: "Admin",    color: "text-destructive border-destructive/40 bg-destructive/10",    icon: Crown, order: 0 },
  BD:    { label: "BD",       color: "text-chart-1 border-chart-1/40 bg-chart-1/10",               icon: Crown, order: 1 },
  TL:    { label: "TL",       color: "text-chart-2 border-chart-2/40 bg-chart-2/10",               icon: Users2, order: 2 },
  TS:    { label: "TS",       color: "text-chart-3 border-chart-3/40 bg-chart-3/10",               icon: User, order: 3 },
};

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.TS;
  return (
    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${cfg.color}`}>
      {initials}
    </div>
  );
}

function UserCard({ user, users, depth = 0, expanded: parentExpanded }: { user: UserItem; users: UserItem[]; depth?: number; expanded?: boolean }) {
  const { t } = useI18n();
  const children = users.filter(u => u.managerId === user.id);
  const [open, setOpen] = useState(depth < 1);
  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.TS;
  const Icon = cfg.icon;

  const depthStyle = depth === 0
    ? "border-primary/30 bg-gradient-to-br from-primary/8 to-primary/3 shadow-lg shadow-primary/5"
    : depth === 1
    ? "border-chart-2/25 bg-chart-2/5"
    : "border-chart-3/20 bg-chart-3/4";

  return (
    <div className={`border rounded-xl transition-all duration-200 ${depthStyle} ${depth === 0 ? 'card-glow' : ''}`}>
      <div
        className={`flex items-center gap-3 p-3 ${children.length > 0 ? 'cursor-pointer' : ''} select-none`}
        onClick={() => children.length > 0 && setOpen(o => !o)}
      >
        <Avatar name={user.name} role={user.role} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider border ${cfg.color} shrink-0`}>
          {cfg.label}
        </Badge>
        {children.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <span className="hidden sm:inline">{children.length} {t("members")}</span>
            {open ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="text-muted-foreground" />}
          </div>
        )}
      </div>

      {open && children.length > 0 && (
        <div className={`pb-3 px-3 space-y-2 border-t border-border/30 pt-3 animate-fade-in`}>
          {children.map(child => (
            <UserCard key={child.id} user={child} users={users} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Hierarchy() {
  const { t } = useI18n();
  const token = useAuth(s => s.token);

  const { data: users, isLoading } = useListUsers({
    query: { enabled: !!token, queryKey: getListUsersQueryKey() }
  });

  const bds = (users || []).filter(u => u.role === 'BD');
  const admin = (users || []).filter(u => u.role === 'ADMIN');

  const totalBD = bds.length;
  const totalTL = (users || []).filter(u => u.role === 'TL').length;
  const totalTS = (users || []).filter(u => u.role === 'TS').length;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gold-gradient tracking-tight">{t("teamHierarchy")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("hierarchyDesc")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in-up delay-100">
        {[
          { label: t("businessDevelopers"), count: totalBD, color: "text-chart-1", bg: "bg-chart-1/10 border-chart-1/25" },
          { label: t("teamLeaders"),        count: totalTL, color: "text-chart-2", bg: "bg-chart-2/10 border-chart-2/25" },
          { label: t("employees"),          count: totalTS, color: "text-chart-3", bg: "bg-chart-3/10 border-chart-3/25" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center card-glow ${s.bg}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{isLoading ? '–' : s.count}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full skeleton-shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up delay-150">
          {/* Admin(s) */}
          {admin.map(u => (
            <UserCard key={u.id} user={u as UserItem} users={(users || []) as UserItem[]} depth={0} />
          ))}

          {/* BD hierarchy trees */}
          {bds.map((bd, i) => (
            <div key={bd.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <UserCard user={bd as UserItem} users={(users || []) as UserItem[]} depth={0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
