import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Activity, Languages, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function Login() {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { t, lang, setLang, isRTL } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const loginSchema = z.object({
    email: z.string().email(t("enterValidEmail")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        setToken(data.token);
        toast({ title: t("welcomeBack"), description: `${t("loggedInAs")} ${data.user.name}` });
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast({
          title: t("loginFailed"),
          description: err.message || t("invalidCredentials"),
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Background glow orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-chart-2/6 rounded-full blur-[100px]" />
        <div className="absolute top-3/4 left-1/4 w-[300px] h-[300px] bg-chart-3/5 rounded-full blur-[90px]" />
      </div>

      {/* Top-right controls */}
      <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex items-center gap-2 z-20`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="text-muted-foreground hover:text-foreground gap-2 text-xs glass rounded-lg px-3"
        >
          <Languages size={14} />
          {lang === 'ar' ? 'English' : 'العربية'}
        </Button>
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground hover:text-foreground glass rounded-lg w-8 h-8"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
        )}
      </div>

      <Card className="w-full max-w-md z-10 glass border-primary/20 shadow-2xl shadow-black/40 animate-scale-in">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 border border-primary/35 flex items-center justify-center shadow-lg shadow-primary/20 animate-gold-pulse">
            <Activity className="text-primary w-7 h-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gold-gradient tracking-tight">{t("signInTo")}</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">{t("enterCredentials")}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        autoComplete="email"
                        {...field}
                        data-testid="input-email"
                        className="bg-background/60 border-border/60 focus:border-primary/60 transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">{t("password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                        data-testid="input-password"
                        className="bg-background/60 border-border/60 focus:border-primary/60 transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full font-semibold shadow-md shadow-primary/20 hover:shadow-primary/35 transition-all"
                disabled={loginMutation.isPending}
                data-testid="button-submit-login"
              >
                {loginMutation.isPending ? t("authenticating") : t("signIn")}
              </Button>
            </form>
          </Form>

          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-sm space-y-2">
            <p className="font-semibold text-foreground text-xs uppercase tracking-wider">{t("demoCredentials")}</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span className="font-mono text-primary">admin@example.com</span>
                <span className="font-mono">admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-chart-2">ashraf@example.com</span>
                <span className="font-mono">password123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-chart-3">hussam.ezz@example.com</span>
                <span className="font-mono">password123</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
