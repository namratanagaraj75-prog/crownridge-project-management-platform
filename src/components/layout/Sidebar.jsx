import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  Receipt,
  FileText,
  Clock,
  Ticket,
  Shield,
  Target,
  ChevronLeft,
  ChevronRight,
  SparklesIcon,
  BarChart3,
  X,
  UserCog,
  Bell,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { ROLE_ACCESS } from "@/lib/permissions";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ROLE_ACCESS.dashboard },
  { label: "Leads", icon: Target, path: "/leads", roles: ROLE_ACCESS.leads },
  { label: "Clients", icon: Users, path: "/clients", roles: ROLE_ACCESS.clients },
  { label: "Projects", icon: FolderKanban, path: "/projects", roles: ROLE_ACCESS.projects },
  { label: "Sprints & Tasks", icon: Briefcase, path: "/sprints", roles: ROLE_ACCESS.sprints },
  { label: "Billing", icon: Receipt, path: "/billing", roles: ROLE_ACCESS.billing },
  { label: "Invoices", icon: FileText, path: "/invoices", roles: ROLE_ACCESS.invoices },
  { label: "Timesheets", icon: Clock, path: "/timesheets", roles: ROLE_ACCESS.timesheets },
  { label: "Support", icon: Ticket, path: "/support", roles: ROLE_ACCESS.support },
  { label: "AMC", icon: Shield, path: "/amc", roles: ROLE_ACCESS.amc },
  { label: "AI Tools", icon: SparklesIcon, path: "/ai-tools", roles: ROLE_ACCESS.aiTools },
  { label: "Analytics", icon: BarChart3, path: "/analytics", roles: ROLE_ACCESS.analytics },
  { label: "Users", icon: UserCog, path: "/users", roles: ROLE_ACCESS.users },
  { label: "Notifications", icon: Bell, path: "/notifications", roles: ROLE_ACCESS.notifications },
  { label: "Messaging", icon: MessageSquare, path: "/messaging", roles: ROLE_ACCESS.messaging },
  { label: "Reports", icon: TrendingUp, path: "/reports", roles: ROLE_ACCESS.reports },
];

// ─── Nav link ────────────────────────────────────────────────────────────────
function NavLink({ item, collapsed, onClick }) {
  const location = useLocation();
  const isActive =
    location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(item.path));

  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium transition-all duration-150 select-none
        ${isActive
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
        }
        ${collapsed ? "justify-center px-2" : ""}
      `}
    >
      <item.icon className={`shrink-0 transition-transform duration-150
        ${collapsed ? "w-5 h-5" : "w-[17px] h-[17px]"}
        ${isActive ? "" : "group-hover:scale-110"}
      `} />
      {!collapsed && <span className="truncate">{item.label}</span>}

      {/* Active indicator */}
      {isActive && !collapsed && (
        <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-primary-foreground/50" />
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5
          bg-popover text-popover-foreground text-xs font-medium
          rounded-lg border border-border shadow-lg
          pointer-events-none opacity-0 group-hover:opacity-100
          transition-opacity duration-150 whitespace-nowrap z-50">
          {item.label}
        </div>
      )}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { label: "Main", paths: ["/dashboard", "/notifications"] },
  { label: "Business", paths: ["/leads", "/clients", "/projects", "/sprints"] },
  { label: "Finance", paths: ["/billing", "/invoices", "/timesheets", "/reports"] },
  { label: "Operations", paths: ["/support", "/amc", "/ai-tools", "/analytics", "/users", "/messaging"] },
];

// ─── Sidebar content ──────────────────────────────────────────────────────────
function SidebarContent({ collapsed, setCollapsed, onClose }) {
  const { userProfile } = useAuth();
  const userRole = userProfile?.role || "developer";
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  // Group items by section
  const sections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: filteredNav.filter((item) => sec.paths.includes(item.path)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand header */}
      <div className={`flex items-center ${collapsed ? "justify-center px-3" : "justify-between px-4"}
        h-14 border-b border-border shrink-0`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600
              flex items-center justify-center shadow-sm shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Crownridge LLP
            </span>
          </div>
        )}

        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600
            flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor" strokeWidth="2" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden flex items-center justify-center w-7 h-7
                rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Collapse toggle — desktop only */}
          {setCollapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center w-6 h-6
                rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              {collapsed
                ? <ChevronRight className="w-3.5 h-3.5" />
                : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto
        scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {sections.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest
                text-muted-foreground/60 select-none">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  onClick={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — version stamp */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground/50 font-medium">
            Crownridge LLP © 2025
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar export ──────────────────────────────────────────────────────
export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-50 w-64 bg-card border-r border-border h-full shadow-2xl
            animate-in slide-in-from-left duration-200">
            <SidebarContent
              collapsed={false}
              setCollapsed={null}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border
          h-screen sticky top-0 shrink-0
          transition-all duration-200 ease-in-out
          ${collapsed ? "w-[60px]" : "w-60"}`}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onClose={null}
        />
      </aside>
    </>
  );
}
