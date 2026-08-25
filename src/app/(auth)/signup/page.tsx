"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/shared/google-icon";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      toast.success("Check your email to confirm your account.");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Takes about a minute. Then we'll get to know you."
      footer={
        <p className="text-sm text-foreground-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-ember font-medium hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full mb-4"
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        <GoogleIcon className="h-4 w-4" />
        {googleLoading ? "Connecting..." : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-foreground-subtle">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Start Discovering"}
        </Button>
        <p className="text-xs text-foreground-subtle text-center pt-1">
          By continuing you agree to REAL&apos;s Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
