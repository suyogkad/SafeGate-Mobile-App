import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/Button";
import { ShieldAlert } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (user && user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-alert/10 text-alert">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="font-display text-[19px] font-medium text-text">Admin access only</h1>
        <p className="max-w-sm text-[13px] text-text-muted">
          Signed in as {user.email}, a {user.role} account. This console is only available to admin accounts.
        </p>
        <Button variant="secondary" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
