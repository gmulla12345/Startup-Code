"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to send message.");
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
        <h3 className="font-display text-xl font-semibold text-foreground mb-2">Message sent</h3>
        <p className="text-sm text-foreground-muted">Thanks for reaching out — we read every message and reply as soon as we can.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          placeholder="Your name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <Textarea
        placeholder="How can we help? (min 10 characters)"
        required
        minLength={10}
        className="min-h-32"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />
      <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto">
        {submitting ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
