import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      
      <div className="max-w-md w-full text-center space-y-6 bg-card border border-border p-8 rounded-2xl shadow-xl transition-all duration-300">
        {/* Warning Icon Container */}
        <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Text Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You do not have permission to access this page. If you believe this is in error, please contact your administrator.
          </p>
        </div>

        {/* Informational Box */}
        <div className="p-4 bg-muted rounded-xl text-left border border-border">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            Possible Reasons
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Your account role lacks access to this feature</li>
            <li>You are logged in with the wrong profile</li>
            <li>Your configuration has changed recently</li>
          </ul>
        </div>

        {/* Button Actions */}
        <div className="pt-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/95 active:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
