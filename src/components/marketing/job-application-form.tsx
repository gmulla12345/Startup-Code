"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

export function JobApplicationForm({ role }: { role: string }) {
  const [form, setForm] = useState({ fullName: "", email: "", linkedinUrl: "", portfolioUrl: "", coverLetter: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          fullName: form.fullName,
          email: form.email,
          linkedinUrl: form.linkedinUrl || null,
          portfolioUrl: form.portfolioUrl || null,
          coverLetter: form.coverLetter,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to submit application.");
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-[var(--forest-soft)]/50 p-8 text-center">
        <h3 className="font-display text-xl font-semibold text-foreground mb-2">Application received</h3>
        <p className="text-sm text-foreground-muted">
          Thanks for applying to the {role} role — we read every application and will reach out if it&apos;s a fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <h3 className="font-display text-lg font-semibold text-foreground">Apply for this role</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          placeholder="Full name"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          placeholder="LinkedIn URL (optional)"
          value={form.linkedinUrl}
          onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
        />
        <Input
          placeholder="Portfolio / work samples URL (optional)"
          value={form.portfolioUrl}
          onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
        />
      </div>
      <Textarea
        placeholder="Tell us why you're a fit for this role (min 20 characters)"
        required
        minLength={20}
        className="min-h-40"
        value={form.coverLetter}
        onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
      />
      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
