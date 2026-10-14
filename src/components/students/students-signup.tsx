"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { campusForEmail, isEduEmail, normalizeEmail, type Campus } from "@/lib/campus";
import { sanitizeCode } from "@/lib/attribution";
import { readAttribution, sendAnalyticsEvent } from "@/lib/analytics/client";
import { cn } from "@/lib/utils/cn";

/**
 * The /students signup: choose a school, give a school (.edu) email, a password
 * and, if there is one, a promo code. A confirmation link is sent to the email;
 * clicking it verifies the address and the database records the campus from its
 * domain (see apply_student_verification). "Don't see your school?" is a short
 * waitlist form instead.
 *
 * The promo code is prefilled from ?code= (or the campaign cookie) and is saved
 * with the account as its campaign code. It does nothing yet beyond that: the
 * redemption itself is validated on the server in a later phase.
 *
 * Measurement: students_page_view on load, signup_started on first touch of the
 * form. Neither carries the email or any other personal data.
 */

const OTHER = "other";

type Mode = "idle" | "submitting" | "sent";

export function StudentsSignup({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(campuses[0]?.slug ?? OTHER);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);

  const [waitEmail, setWaitEmail] = useState("");
  const [waitSchool, setWaitSchool] = useState("");
  const [waitCompany, setWaitCompany] = useState(""); // honeypot
  const [waitMode, setWaitMode] = useState<Mode>("idle");

  const startedRef = useRef(false);

  // Prefill the promo code from the link the visitor arrived with, and record the
  // page view. Runs after mount, not during render, so the page itself stays
  // static and cacheable (a server render cannot see the query string).
  useEffect(() => {
    const fromUrl = sanitizeCode(new URLSearchParams(window.location.search).get("code"));
    const prefill = fromUrl ?? readAttribution().code;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL/cookie after mount to keep the page static
    if (prefill) setCode(prefill);
    sendAnalyticsEvent("students_page_view");
  }, []);

  const campus = campuses.find((c) => c.slug === selected) ?? null;
  const detected = isEduEmail(email) ? campusForEmail(email, campuses) : null;
  const placeholderDomain = campus?.emailDomains[0] ?? "school.edu";

  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    sendAnalyticsEvent("signup_started", { method: "email" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEduEmail(email)) {
      setError("Please use your school email, ending in .edu.");
      return;
    }
    if (password.length < 8) {
      setError("Passwords need at least eight characters.");
      return;
    }
    const typedCode = sanitizeCode(code);
    if (code.trim() && !typedCode) {
      setError("Codes use letters, numbers and hyphens.");
      return;
    }

    setMode("submitting");
    const attribution = readAttribution();
    const finalCode = typedCode ?? attribution.code;

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        // The campaign values are saved on the account by the signup trigger.
        data: {
          ...(attribution.src ? { src: attribution.src } : {}),
          ...(finalCode ? { code: finalCode } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
      },
    });

    if (signUpError) {
      setMode("idle");
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    setMode("sent");
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWaitMode("submitting");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: waitEmail, school: waitSchool || undefined, company: waitCompany }),
    }).catch(() => null);

    if (res?.ok) {
      setWaitMode("sent");
      return;
    }
    setWaitMode("idle");
    const body = res ? await res.json().catch(() => null) : null;
    setError(body?.error ?? "Something went wrong. Please try again.");
  }

  const card = "rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8";

  if (mode === "sent") {
    return (
      <div className={card} role="status">
        <h2 className="font-display text-2xl font-semibold text-foreground">Check your inbox.</h2>
        <p className="mt-3 text-foreground-muted">
          We sent a link to <span className="text-foreground">{normalizeEmail(email)}</span>. Open it to confirm your
          school email.
        </p>
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="mt-6 text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <div className={card}>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-foreground">Your school</legend>
        <div className="space-y-2">
          {[...campuses.map((c) => ({ slug: c.slug, label: c.name })), { slug: OTHER, label: "Don't see your school?" }].map(
            (option) => (
              <label key={option.slug} className="block cursor-pointer">
                <input
                  type="radio"
                  name="school"
                  value={option.slug}
                  checked={selected === option.slug}
                  onChange={() => {
                    setSelected(option.slug);
                    setError(null);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex items-center justify-between rounded-[var(--radius-md)] border border-border-strong px-4 py-3 text-sm text-foreground transition-colors",
                    "peer-checked:border-foreground peer-checked:bg-surface-sunken peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)]"
                  )}
                >
                  {option.label}
                  {selected === option.slug && <Check className="h-4 w-4" aria-hidden />}
                </span>
              </label>
            )
          )}
        </div>
      </fieldset>

      {selected !== OTHER ? (
        <form onSubmit={handleSubmit} onFocusCapture={markStarted} className="mt-6 space-y-3" noValidate>
          <div>
            <label htmlFor="students-email" className="mb-1.5 block text-sm font-medium text-foreground">
              School email
            </label>
            <Input
              id="students-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={`you@${placeholderDomain}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {detected && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground-muted">
                <Check className="h-3.5 w-3.5" aria-hidden /> {detected.name}
              </p>
            )}
            {!detected && isEduEmail(email) && (
              <p className="mt-1.5 text-sm text-foreground-muted">
                We are not at that school yet. You can still create an account, or{" "}
                <button
                  type="button"
                  className="underline underline-offset-4 hover:text-foreground"
                  onClick={() => {
                    setWaitEmail(email);
                    setSelected(OTHER);
                  }}
                >
                  join the waitlist
                </button>
                .
              </p>
            )}
          </div>

          <div>
            <label htmlFor="students-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="students-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least eight characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="students-code" className="mb-1.5 block text-sm font-medium text-foreground">
              Promo code
            </label>
            <Input
              id="students-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Optional"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={mode === "submitting"}>
            {mode === "submitting" ? "Creating your account" : "Create account"}
          </Button>
          <p className="pt-1 text-center text-xs text-foreground-subtle">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      ) : waitMode === "sent" ? (
        <p role="status" className="mt-6 text-foreground">
          Thank you. We will write when we reach your school.
        </p>
      ) : (
        <form onSubmit={handleWaitlist} className="mt-6 space-y-3" noValidate>
          <div>
            <label htmlFor="waitlist-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Your email
            </label>
            <Input
              id="waitlist-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@school.edu"
              value={waitEmail}
              onChange={(e) => setWaitEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="waitlist-school" className="mb-1.5 block text-sm font-medium text-foreground">
              Your school
            </label>
            <Input
              id="waitlist-school"
              autoComplete="organization"
              placeholder="Optional"
              maxLength={100}
              value={waitSchool}
              onChange={(e) => setWaitSchool(e.target.value)}
            />
          </div>
          {/* A honeypot: hidden from people and from assistive technology. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Company
              <input tabIndex={-1} autoComplete="off" value={waitCompany} onChange={(e) => setWaitCompany(e.target.value)} />
            </label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={waitMode === "submitting"}>
            Join the waitlist
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ember hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
