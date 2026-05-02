import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Link as LinkIcon, 
  RefreshCw, 
  Settings, 
  LogOut,
  Menu,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/users", label: "Users", icon: Users },
  { href: "/mapping", label: "Odoo Mapping", icon: LinkIcon },
  { href: "/sync", label: "Sync Status", icon: RefreshCw },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { setToken } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    setToken(null);
  };

  const NavLinks = () => (
    <>
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span
                data-testid={`link-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto pt-4 border-t border-border space-y-2">
        {mounted && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="button-toggle-theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" 
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="font-bold text-lg text-primary tracking-tight">OdooLens</div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] flex flex-col p-4">
            <div className="font-bold text-xl text-primary tracking-tight mb-8 pl-2">OdooLens</div>
            <NavLinks />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4">
        <div className="font-bold text-xl text-primary tracking-tight mb-8 pl-2 flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md"></div>
          OdooLens
        </div>
        <NavLinks />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
