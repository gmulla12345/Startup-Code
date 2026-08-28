"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

export function JobApplicationForm({ role }: { role: string }) {
  const [form, setForm] = useState({ fullName: "", email: "", linkedinUrl: "", coverLetter: "" });
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("role", role);
      body.set("fullName", form.fullName);
      body.set("email", form.email);
      body.set("linkedinUrl", form.linkedinUrl);
      body.set("coverLetter", form.coverLetter);
      if (resume) body.set("resume", resume);

      const res = await fetch("/api/careers/apply", { method: "POST", body });
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
      <Input
        placeholder="LinkedIn URL (optional)"
        value={form.linkedinUrl}
        onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
      />
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Resume / portfolio (optional)
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setResume(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-foreground-muted file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ember-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[color:var(--ember-strong)] hover:file:opacity-90"
        />
        <p className="text-xs text-foreground-subtle mt-1">PDF, DOC, or DOCX, up to 5MB.</p>
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
