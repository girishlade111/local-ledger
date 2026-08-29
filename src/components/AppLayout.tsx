import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, Menu, Sparkles } from "lucide-react";
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
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            {item.label}
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
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl tracking-tight text-sidebar-foreground">
            Local Ledger
          </h1>
          <p className="text-xs text-muted-foreground">Offline invoicing</p>
        </div>
        {isPro && (
          <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary shadow-xs">
            PRO ⭐
          </span>
        )}
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
        <div className="text-[11px] text-muted-foreground">All data stays on this device.</div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

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
          <h1 className="font-display text-lg tracking-tight">Local Ledger</h1>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
