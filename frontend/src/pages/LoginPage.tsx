import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, status } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (status === "authenticated") return <Navigate to="/" replace />;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Welcome back");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      toast.error("Couldn't sign in", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px, 64px 64px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <path
                d="M12 3C8 3 6 6 6 9.5c0 2 .8 3.3 1.6 4.4C8.4 15 9 16 9 17.5V19a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1.5c0-1.5.6-2.5 1.4-3.6.8-1.1 1.6-2.4 1.6-4.4C18 6 16 3 12 3Z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-[17px] font-medium">SafeGate</span>
        </div>
        <div className="relative max-w-sm">
          <p className="font-display text-[28px] font-medium leading-[1.25] italic">
            "Steady support, at a child's own pace."
          </p>
          <p className="mt-4 text-[14px] text-white/70">
            Administrative console for the SafeGate support platform -- manage accounts and keep an eye on how
            sessions and routines are going, without ever touching a conversation directly.
          </p>
        </div>
        <p className="relative text-[12px] text-white/50">A support and learning tool -- not a monitoring service.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
              <LockKeyhole className="size-4.5" />
            </span>
          </div>
          <h1 className="font-display text-[24px] font-medium text-text">Sign in to the console</h1>
          <p className="mt-1.5 text-[13.5px] text-text-muted">Admin accounts only.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" size="lg" loading={submitting} className="mt-1.5 w-full">
              {submitting ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
