import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// ─── Page title map ─────────────────────────────────────────────────────────
const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/clients": "Clients",
  "/projects": "Projects",
  "/sprints": "Sprints & Tasks",
  "/billing": "Billing",
  "/invoices": "Invoices",
  "/timesheets": "Timesheets",
  "/support": "Support",
  "/amc": "AMC",
  "/ai-tools": "AI Tools",
  "/analytics": "Analytics",
  "/users": "User Management",
};

// ─── Role label map ──────────────────────────────────────────────────────────
const ROLE_LABELS = {
  admin: "Admin",
  project_manager: "Project Manager",
  developer: "Developer",
  qa: "QA Engineer",
  support: "Support",
  client: "Client",
};

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  project_manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  developer: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  qa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  support: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  client: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

// ─── Avatar initials helper ──────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Theme cycle button ──────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  const cycle = () => {
    if (theme === "light") return setTheme("dark");
    if (theme === "dark") return setTheme("system");
    return setTheme("light");
  };

  const Icon = theme === "system" ? Monitor : isDark ? Moon : Sun;

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl
        bg-muted hover:bg-accent text-muted-foreground hover:text-foreground
        transition-all duration-200 hover:scale-105"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ─── Notifications bell ──────────────────────────────────────────────────────
function NotificationBell() {
  return (
    <button className="relative flex items-center justify-center w-9 h-9 rounded-xl
      bg-muted hover:bg-accent text-muted-foreground hover:text-foreground
      transition-all duration-200 hover:scale-105">
      <Bell className="w-4 h-4" />
      {/* Unread dot */}
      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary
        ring-2 ring-background" />
    </button>
  );
}

// ─── Profile dropdown ────────────────────────────────────────────────────────
function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const initials = getInitials(user?.full_name || user?.displayName);
  const name = user?.full_name || user?.displayName || "User";
  const email = user?.email || "";
  const role = user?.role || "developer";
  const roleLabel = ROLE_LABELS[role] || role;
  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.developer;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl
          hover:bg-muted transition-all duration-200 group"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600
          flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
          {initials}
        </div>
        {/* Name + role (hidden on sm) */}
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-foreground max-w-[120px] truncate">
            {name}
          </span>
          <span className={`text-[10px] font-medium px-1.5 rounded-full ${roleColor}`}>
            {roleLabel}
          </span>
        </div>
        <ChevronDown className={`hidden md:block w-3.5 h-3.5 text-muted-foreground
          transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 z-50
          bg-card border border-border rounded-2xl shadow-xl
          ring-1 ring-black/5 dark:ring-white/5
          animate-in fade-in slide-in-from-top-2 duration-150">

          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600
                flex items-center justify-center text-white text-sm font-bold shadow shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5
                  rounded-full mt-0.5 ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => { setOpen(false); navigate("/profile"); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                text-sm text-foreground hover:bg-muted transition-colors duration-150 text-left"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              My Profile
            </button>
            <button
              onClick={() => { setOpen(false); navigate("/settings"); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                text-sm text-foreground hover:bg-muted transition-colors duration-150 text-left"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Settings
            </button>
          </div>

          {/* Logout */}
          <div className="p-1.5 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                text-sm text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-950/40
                transition-colors duration-150 text-left font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Topbar ─────────────────────────────────────────────────────────────
export default function Topbar({ onMobileMenuToggle }) {
  const location = useLocation();
  const { userProfile } = useAuth();

  // Determine page title
  const pathname = location.pathname;
  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || (path !== "/" && pathname.startsWith(path))
  )?.[1] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center
      bg-background/80 backdrop-blur-md border-b border-border
      px-4 gap-4
      transition-all duration-200">

      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl
          bg-muted hover:bg-accent text-muted-foreground hover:text-foreground
          transition-all duration-200"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Left: Logo + page title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo mark (desktop always shows, mobile shows when sidebar closed) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600
            flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="hidden lg:block font-bold text-sm text-foreground tracking-tight">
            Crownridge LLP
          </span>
        </div>

        {/* Divider */}
        <span className="hidden lg:block text-border text-lg font-light select-none">/</span>

        {/* Current page title */}
        <h1 className="text-sm font-semibold text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border mx-1" />
        <ProfileDropdown user={userProfile} />
      </div>
    </header>
  );
}
