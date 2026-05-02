import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
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
  Sun,
  GitBranch,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { setToken } = useAuth();
  const { t, lang, setLang, isRTL } = useI18n();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const NAV_ITEMS = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/tickets",   label: t("tickets"),   icon: Ticket },
    { href: "/hierarchy", label: t("hierarchy"), icon: GitBranch },
    { href: "/users",     label: t("users"),     icon: Users },
    { href: "/mapping",   label: t("mapping"),   icon: LinkIcon },
    { href: "/sync",      label: t("sync"),      icon: RefreshCw },
    { href: "/settings",  label: t("settings"),  icon: Settings },
  ];

  const NavLinks = () => (
    <nav className="flex flex-col h-full">
      <div className="space-y-0.5 flex-1">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <span
                data-testid={`link-${item.href.replace("/", "")}`}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-fade-in flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium
                  ${isActive
                    ? "nav-active animate-gold-pulse"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon size={17} className={isActive ? "text-primary" : ""} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border space-y-1">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          data-testid="button-toggle-lang"
        >
          <Languages size={16} />
          {lang === 'ar' ? 'English' : 'العربية'}
        </Button>

        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="button-toggle-theme"
          >
            {theme === 'dark'
              ? <><Sun size={16} />{t("lightMode")}</>
              : <><Moon size={16} />{t("darkMode")}</>
            }
          </Button>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setToken(null)}
          data-testid="button-logout"
        >
          <LogOut size={16} />
          {t("logout")}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row" dir={isRTL ? "rtl" : "ltr"}>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="font-bold text-lg text-gold-gradient tracking-tight">OdooLens</div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side={isRTL ? "right" : "left"} className="w-[260px] flex flex-col p-4 bg-card border-border">
            <div className="font-bold text-xl text-gold-gradient mb-8 pl-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-primary text-xs font-black">OL</span>
              </div>
              OdooLens
            </div>
            <NavLinks />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-e border-border bg-sidebar p-3 sticky top-0 h-screen overflow-y-auto">
        <div className="font-bold text-lg text-gold-gradient mb-7 px-2 pt-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/35 flex items-center justify-center animate-gold-pulse">
            <span className="text-primary text-xs font-black">OL</span>
          </div>
          OdooLens
        </div>
        <NavLinks />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-screen">
        <div className="flex-1 overflow-auto p-4 md:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
