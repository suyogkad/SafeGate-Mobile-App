import { Activity, Baby, CalendarClock, LayoutGrid, LogOut, ScrollText, ShieldAlert, Users2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/users", label: "Users", icon: Users2, end: false },
  { to: "/children", label: "Children", icon: Baby, end: false },
  { to: "/sessions", label: "Sessions", icon: CalendarClock, end: false },
  { to: "/safety", label: "Safety", icon: ShieldAlert, end: false },
  { to: "/audit", label: "Audit log", icon: ScrollText, end: false },
  { to: "/system", label: "System", icon: Activity, end: false },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
          <svg viewBox="0 0 24 24" fill="none" className="size-4.5">
            <path
              d="M12 3C8 3 6 6 6 9.5c0 2 .8 3.3 1.6 4.4C8.4 15 9 16 9 17.5V19a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1.5c0-1.5.6-2.5 1.4-3.6.8-1.1 1.6-2.4 1.6-4.4C18 6 16 3 12 3Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-medium text-text">SafeGate</p>
          <p className="text-[11px] text-text-muted">Admin console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "bg-tint-sage text-primary-hover"
                  : "text-text-muted hover:bg-tint-sand/50 hover:text-text",
              )
            }
          >
            <Icon className="size-[18px]" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user?.full_name ?? "?"} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-text">{user?.full_name}</p>
            <p className="truncate text-[12px] text-text-muted">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-alert/10 hover:text-alert"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
