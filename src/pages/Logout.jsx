import React, { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-muted-foreground">Logging you out securely…</p>
      </div>
    </div>
  );
}
