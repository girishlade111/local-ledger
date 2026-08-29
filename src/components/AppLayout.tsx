import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Crown, FileText, Menu, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getSettings } from "@/db/settings";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/invoices", label: "Invoices" },
  { to: "/clients", label: "Clients" },
  { to: "/settings", label: "Settings" },
  { to: "/pro", label: "PRO Features ⭐" },
] as const;

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active =
          item.to === "/" ? path === "/" : path === item.to || path.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <span>{item.label}</span>
            {item.to === "/invoices" && (
              <span className="hidden sm:inline font-mono text-[10px] opacity-60 text-sidebar-foreground bg-sidebar-border/60 px-1.5 py-0.5 rounded">
                Ctrl+N
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    getSettings().then((s) => setIsPro(Boolean(s.isPro)));
  }, []);

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="px-2 flex items-center justify-between">
        <Link to="/" onClick={onNavigate} className="space-y-0.5 hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm shadow-xs">
              L
            </span>
            <h1 className="font-display text-xl font-bold tracking-tight text-sidebar-foreground">
              Local Ledger
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground pl-8">100% Private Offline Invoicing</p>
        </Link>
        {isPro && (
          <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary shadow-xs">
            PRO ⭐
          </span>
        )}
      </div>

      {/* Quick Action: New Invoice CTA */}
      <div className="px-2">
        <Button
          asChild
          size="sm"
          className="w-full justify-between gap-2 shadow-xs cursor-pointer text-xs font-semibold h-9"
        >
          <Link to="/invoices/new" onClick={onNavigate}>
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Invoice
            </span>
            <kbd className="hidden sm:inline font-mono text-[10px] opacity-80 bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded">
              Ctrl+N
            </kbd>
          </Link>
        </Button>
      </div>

      <NavList onNavigate={onNavigate} />

      <div className="mt-auto space-y-3 px-2">
        {!isPro && (
          <Link
            to="/pro"
            onClick={onNavigate}
            className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 cursor-pointer shadow-xs"
          >
            <span className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Upgrade to PRO
            </span>
            <Sparkles className="h-3 w-3 animate-pulse" />
          </Link>
        )}
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>All data stays on this device</span>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Global Keyboard Shortcut: Ctrl+N / Cmd+N for New Invoice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "n" || e.key === "N")) {
        // Prevent default browser behavior (e.g. open new window)
        e.preventDefault();
        setOpen(false);
        navigate({ to: "/invoices/new" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0 [&>button]:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xs">
              L
            </span>
            <h1 className="font-display text-lg font-bold tracking-tight">Local Ledger</h1>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
