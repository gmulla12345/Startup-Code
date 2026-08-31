"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { PillGroup } from "@/components/onboarding/pill-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/db/seed-data";

interface AdminExperience {
  id: string;
  title: string;
  city: string;
  category: string;
  price_level: string;
  is_featured: boolean;
  is_hidden_gem: boolean;
  rating: number | null;
}

const EMPTY_FORM = {
  slug: "",
  title: "",
  description: "",
  shortDescription: "",
  category: "outdoor_adventure",
  city: "",
  country: "USA",
  latitude: 0,
  longitude: 0,
  priceLevel: "medium" as const,
  priceEstimate: 0,
  indoorOutdoor: "either" as const,
  socialMode: "either" as const,
  bestTimeOfDay: "any" as const,
  isFeatured: false,
  isHiddenGem: false,
  imagesText: "",
};

export function ExperienceManager() {
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/experiences");
    const json = await res.json();
    setExperiences(json.experiences ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount; loading already starts true
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this experience? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/experiences?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted.");
      load();
    } else {
      toast.error("Failed to delete.");
    }
  }

  async function toggleFeatured(exp: AdminExperience) {
    const res = await fetch("/api/admin/experiences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: exp.id, isFeatured: !exp.is_featured }),
    });
    if (res.ok) load();
  }

  async function handleCreate() {
    if (!form.slug || !form.title || !form.city) {
      toast.error("Slug, title, and city are required.");
      return;
    }
    const images = form.imagesText
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (images.length === 0) {
      toast.error("Add at least one image URL — listings without a photo look broken to users.");
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarding imagesText, the form field that isn't part of the API shape
      const { imagesText, ...rest } = form;
      const res = await fetch("/api/admin/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          requirements: [],
          images,
          tags: [],
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to create.");
      }
      toast.success("Experience created.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Experiences</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> Add experience
        </Button>
      </div>

      {showForm && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 mb-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input placeholder="Slug (unique-url-slug)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <Textarea placeholder="Short description" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
          <Textarea placeholder="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div>
            <label className="text-xs font-medium text-foreground-muted mb-1.5 block">
              Image URLs (one per line — use real photos of this exact place; avoid generic stock photos that don&apos;t match)
            </label>
            <Textarea
              placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"}
              value={form.imagesText}
              onChange={(e) => setForm({ ...form, imagesText: e.target.value })}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input
              type="number"
              placeholder="Latitude"
              value={form.latitude || ""}
              onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Longitude"
              value={form.longitude || ""}
              onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-muted mb-1.5 block">Category</label>
            <PillGroup
              options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-muted mb-1.5 block">Price level</label>
            <PillGroup
              options={[
                { value: "free", label: "Free" },
                { value: "low", label: "$" },
                { value: "medium", label: "$$" },
                { value: "high", label: "$$$" },
                { value: "luxury", label: "$$$$" },
              ]}
              value={form.priceLevel}
              onChange={(priceLevel) => setForm({ ...form, priceLevel: priceLevel as typeof form.priceLevel })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} loading={saving}>
              {saving ? "Creating..." : "Create experience"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-foreground-muted">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">City</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Featured</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-3">
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : (
              experiences.map((exp) => (
                <tr key={exp.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-foreground">{exp.title}</td>
                  <td className="p-3 text-foreground-muted">{exp.city}</td>
                  <td className="p-3 text-foreground-muted">{exp.category}</td>
                  <td className="p-3">
                    <button onClick={() => toggleFeatured(exp)}>
                      <Star className={exp.is_featured ? "h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" : "h-4 w-4 text-border-strong"} />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(exp.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
