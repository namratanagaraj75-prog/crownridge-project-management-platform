import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Compact theme toggle — cycles: light → dark → system.
 * Used on auth/error pages that don't have the Topbar.
 */
export function ModeToggle({ className }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const cycle = () => {
    if (theme === "light") return setTheme("dark");
    if (theme === "dark") return setTheme("system");
    return setTheme("light");
  };

  const Icon =
    theme === "system" ? Monitor
      : resolvedTheme === "dark" ? Moon
        : Sun;

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      className={`flex items-center justify-center w-9 h-9 rounded-xl
        bg-muted hover:bg-accent text-muted-foreground hover:text-foreground
        transition-all duration-200 hover:scale-105 ${className ?? ""}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
