import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { SettingsSheet } from "@/components/settings-sheet";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";

function BallMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#d9f99d" stroke="#3f6212" strokeWidth="1.5" />
      <path d="M4.5 5.5c3.5 2.5 3.5 10.5 0 13M19.5 5.5c-3.5 2.5-3.5 10.5 0 13" fill="none" stroke="#3f6212" strokeWidth="1.5" />
    </svg>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const nav = routes.filter((r) => r.label);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:outline-2 focus:outline-ring"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-ring">
            <BallMark />
            <span className="hidden sm:inline">Tennis Scorecard</span>
          </NavLink>
          <nav aria-label="Main" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((r) => {
              const Icon = r.icon;
              const active = r.path === "/" ? pathname === "/" : pathname.startsWith(r.path);
              return (
                <NavLink
                  key={r.path}
                  to={r.path}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {Icon && <Icon className="size-4" aria-hidden="true" />}
                  {r.label}
                </NavLink>
              );
            })}
          </nav>
          <SettingsSheet />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-1"
        >
          <Outlet />
        </motion.div>
      </main>
      <Toaster />
    </div>
  );
}

export default AppShell;
