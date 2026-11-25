import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/queries";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  PartyPopper,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sun,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import logo from "@/assets/wine-barbell-logo.png.asset.json";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavigationItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const alunoGroups: NavigationGroup[] = [
  {
    label: "Principal",
    items: [
      { to: "/app", label: "Início", icon: Home },
      { to: "/agenda", label: "Reservas e fila", icon: CalendarDays },
      { to: "/checkin", label: "Check-in", icon: CheckCircle2 },
      { to: "/wod", label: "WOD", icon: Dumbbell },
    ],
  },
  {
    label: "Minha jornada",
    items: [
      { to: "/performance", label: "Performance", icon: TrendingUp },
      { to: "/eventos", label: "Eventos", icon: PartyPopper },
      { to: "/planos", label: "Plano", icon: CreditCard },
      { to: "/financeiro", label: "Financeiro", icon: ReceiptText },
      { to: "/perfil", label: "Perfil", icon: User },
    ],
  },
];

/** Abas fixas do aluno no celular (o menu lateral continua com o resto). */
const alunoTabs: NavigationItem[] = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/checkin", label: "Check-in", icon: CheckCircle2 },
  { to: "/perfil", label: "Perfil", icon: User },
];

function BottomNav({ path }: { path: string }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-4">
        {alunoTabs.map((t) => {
          const ativo = path === t.to || path.startsWith(`${t.to}/`);
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                aria-current={ativo ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${ativo ? "text-primary" : "text-muted-foreground"}`}
              >
                {ativo && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
                <Icon className="size-5" aria-hidden="true" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const professorGroups: NavigationGroup[] = [
  {
    label: "Professor",
    items: [
      { to: "/professor/aulas", label: "Minhas aulas", icon: ClipboardCheck },
      { to: "/agenda", label: "Agenda", icon: CalendarDays },
      { to: "/wod", label: "WOD", icon: Dumbbell },
    ],
  },
  { label: "Conta", items: [{ to: "/perfil", label: "Perfil", icon: User }] },
];

const adminGroups: NavigationGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/alunos", label: "Alunos", icon: Users },
      { to: "/admin/assiduidade", label: "Assiduidade", icon: CheckCircle2 },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/admin/agenda", label: "Agenda", icon: CalendarClock },
      { to: "/admin/horarios", label: "Horários e turmas", icon: CalendarDays },
      { to: "/admin/planos", label: "Planos", icon: CreditCard },
      { to: "/admin/financeiro", label: "Financeiro", icon: ReceiptText },
      { to: "/admin/eventos", label: "Eventos", icon: PartyPopper },
      { to: "/admin/treinos", label: "Treinos", icon: Dumbbell },
    ],
  },
];

const masterGroups: NavigationGroup[] = [
  ...adminGroups,
  {
    label: "Administração Master",
    items: [
      { to: "/admin/usuarios", label: "Usuários e perfis", icon: ShieldCheck },
      { to: "/admin/whatsapp", label: "WhatsApp do bot", icon: MessageCircle },
      { to: "/admin/modalidades", label: "Configurações", icon: Settings },
    ],
  },
];

function isActivePath(path: string, to: string) {
  return path === to || (to !== "/app" && to !== "/admin" && path.startsWith(`${to}/`));
}

function NavigationSidebar({ groups, path }: { groups: NavigationGroup[]; path: string }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 overflow-hidden rounded-md px-1 py-1"
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <img src={logo.url} alt="" className="size-9 shrink-0 object-contain" aria-hidden="true" />
          <span className="min-w-0 truncate font-display text-lg leading-none text-gold-gradient group-data-[collapsible=icon]:hidden">
            WINE BARBELL CLUB
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActivePath(path, item.to)}
                        tooltip={item.label}
                        className="relative h-10 gap-3 data-[active=true]:before:absolute data-[active=true]:before:inset-y-1 data-[active=true]:before:left-0 data-[active=true]:before:w-0.5 data-[active=true]:before:bg-sidebar-primary"
                      >
                        <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Notificações">
              <Link
                to={path.startsWith("/admin") ? "/admin/notificacoes" : "/notificacoes"}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <Bell />
                <span>Notificações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isAdmin, isAdminMaster, isProfessor, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-planos-pendentes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: "tipo=eq.admin_plano_pendente" },
        (payload) => {
          const n = payload.new as { titulo: string; mensagem: string };
          toast.info(n.titulo, {
            description: n.mensagem,
            duration: 12000,
            action: { label: "Ver", onClick: () => navigate({ to: "/admin/financeiro" }) },
          });
          queryClient.invalidateQueries({ queryKey: qk.notificacoes });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate, queryClient]);

  useEffect(() => {
    if (!loading && isAdmin && !path.startsWith("/admin")) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, isAdmin, path, navigate]);

  const groups = isAdminMaster
    ? masterGroups
    : isAdmin
      ? adminGroups
      : isProfessor
        ? professorGroups
        : alunoGroups;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mostrarAbas = !loading && !isAdmin && !isProfessor;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)").matches;
    const saved = window.localStorage.getItem("wbc-sidebar-open");
    setSidebarOpen(desktop ? saved !== "false" : false);
  }, []);

  function updateSidebar(open: boolean) {
    setSidebarOpen(open);
    if (window.matchMedia("(min-width: 1280px)").matches) {
      window.localStorage.setItem("wbc-sidebar-open", String(open));
    }
  }


  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }


  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={updateSidebar}>
      <NavigationSidebar groups={groups} path={path} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="grid h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-4">
            <SidebarTrigger className="size-9" aria-label="Abrir ou recolher menu">
              <Menu className="size-5" />
            </SidebarTrigger>

            <Link
              to={isAdmin ? "/admin" : isProfessor ? "/professor/aulas" : "/app"}
              className="flex min-w-0 items-center justify-center gap-2 md:justify-start"
            >
              <img src={logo.url} alt="" className="size-8 shrink-0 object-contain md:hidden" aria-hidden="true" />
              <span className="truncate font-display text-base leading-none text-gold-gradient sm:text-lg md:hidden">
                WINE BARBELL CLUB
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-1">
              {!isAdmin && (
                <Button variant="ghost" size="icon" asChild aria-label="Abrir perfil" className={mostrarAbas ? "hidden md:inline-flex" : undefined}>
                  <Link to="/perfil">
                    <User className="size-4" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={sair} aria-label="Sair da conta">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main
          className={`mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8 ${mostrarAbas ? "pb-28 md:pb-5" : ""}`}
        >
          {children}
        </main>
        {mostrarAbas && <BottomNav path={path} />}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function PageTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="break-words font-display text-3xl leading-none text-foreground">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="surface-panel px-5 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
