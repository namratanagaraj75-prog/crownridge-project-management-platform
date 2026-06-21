import React from "react";

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  subtitle,
  className = "",
}) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-heading font-bold text-foreground">
            {value}
          </p>
          {(change || subtitle) && (
            <p className="text-xs">
              {change && (
                <span
                  className={
                    changeType === "positive"
                      ? "text-emerald-500"
                      : changeType === "negative"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }
                >
                  {change}
                </span>
              )}
              {subtitle && (
                <span className="text-muted-foreground ml-1">{subtitle}</span>
              )}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
