"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecoveryFlow = searchParams.get("code") !== null;

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sessionReady, setSessionReady] = useState(!isRecoveryFlow);

  useEffect(() => {
    if (!isRecoveryFlow) return;
    const supabase = createClient();
    const code = searchParams.get("code")!;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) toast.error("This reset link has expired. Request a new one.");
      setSessionReady(!error);
    });
  }, [isRecoveryFlow, searchParams]);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated. You're logged in.");
    router.push("/home");
  }

  if (isRecoveryFlow) {
    return (
      <AuthShell title="Set a new password" subtitle="Choose something you haven't used before.">
        <form onSubmit={handleSetNewPassword} className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
            disabled={!sessionReady}
          />
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!sessionReady}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to get back in."
      footer={
        <p className="text-sm text-foreground-muted">
          Remembered it?{" "}
          <Link href="/login" className="text-ember font-medium hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      {sent ? (
        <p className="text-sm text-foreground-muted bg-surface-sunken rounded-[var(--radius-md)] p-4">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
