import React from "react";
import { ModeToggle } from "@/components/ModeToggle";

/**
 * Shared wrapper for all auth pages (Login, Register, ForgotPassword, etc.)
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      {/* Subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(24 95% 53% / 0.06) 0%, transparent 50%), " +
            "radial-gradient(circle at 80% 80%, hsl(24 95% 53% / 0.04) 0%, transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand mark */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600
              flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">
              Crownridge LLP
            </span>
          </div>

          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
          )}

          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
