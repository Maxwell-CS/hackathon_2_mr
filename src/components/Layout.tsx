import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tropels", label: "Atlas de Tropeles" },
  { to: "/signals/feed", label: "Feed de Señales" },
  { to: "/sectors", label: "Sectores" },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
    isActive
      ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/30"
      : "text-slate-400 hover:bg-ink-700 hover:text-slate-100",
  ].join(" ");
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-ink-950">
              <svg className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor">
                <circle cx="11" cy="13" r="3" />
                <circle cx="21" cy="13" r="3" />
              </svg>
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-slate-100 sm:block">
              TropelCare <span className="text-brand-400">Control Room</span>
            </span>
          </NavLink>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-200">
                {user?.displayName}
              </p>
              <p className="text-[11px] text-slate-500">{user?.teamCode}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
            >
              Salir
            </button>
            <button
              type="button"
              className="rounded-lg border border-ink-600 p-1.5 text-slate-300 md:hidden"
              aria-label="Menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-ink-700 px-4 py-2 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
