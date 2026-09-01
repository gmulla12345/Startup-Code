"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { X, ChevronLeft, ChevronRight, Repeat, Trash2, Star, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Itinerary, ItineraryItem } from "@/types/database";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface Alternative {
  experienceId: string;
  title: string;
  category: string;
  images: string[];
  priceEstimate: number | null;
  priceLevel: string;
  rating: number | null;
  shortDescription: string;
}

function dayLabel(itinerary: Itinerary, dayIndex: number): string {
  if (itinerary.startDate) {
    const date = new Date(`${itinerary.startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + dayIndex);
    const formatted = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
    return `Day ${dayIndex + 1} — ${formatted}`;
  }
  return `Day ${dayIndex + 1}`;
}

export function ItineraryDetail({ itinerary, items: initialItems }: { itinerary: Itinerary; items: ItineraryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const canSwap = itinerary.destinationLatitude != null;

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  async function sendChatMessage() {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatMessages((prev) => [...prev, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`/api/itineraries/${itinerary.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");

      setChatMessages((prev) => [...prev, { role: "assistant", text: json.reply }]);
      if (json.item) {
        setItems((prev) => prev.map((i) => (i.id === json.item.id ? json.item : i)));
      } else if (json.removed && json.itemId) {
        setItems((prev) => prev.filter((i) => i.id !== json.itemId));
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      setChatMessages((prev) => [...prev, { role: "assistant", text }]);
    } finally {
      setChatLoading(false);
    }
  }

  function openItem(item: ItineraryItem) {
    setActiveItem(item);
    setImageIndex(0);
    setAlternatives(null);
  }

  function closeModal() {
    setActiveItem(null);
    setAlternatives(null);
  }

  async function loadAlternatives() {
    if (!activeItem) return;
    setLoadingAlternatives(true);
    try {
      const res = await fetch(`/api/itineraries/${itinerary.id}/items/${activeItem.id}/alternatives`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't load alternatives.");
      setAlternatives(json.alternatives);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoadingAlternatives(false);
    }
  }

  async function applySwap(alt: Alternative | null) {
    if (!activeItem) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/itineraries/${itinerary.id}/items/${activeItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          alt
            ? {
                experienceId: alt.experienceId,
                title: alt.title,
                notes: alt.shortDescription,
                estimatedCost: alt.priceEstimate,
                images: alt.images,
              }
            : {
                experienceId: null,
                title: "Free time",
                notes: "Nothing planned for this slot — open to whatever you find.",
                estimatedCost: 0,
                images: [],
              }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't update this item.");
      setItems((prev) => prev.map((i) => (i.id === activeItem.id ? json.item : i)));
      toast.success(alt ? `Swapped in ${alt.title}.` : "Cleared this slot.");
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setMutating(false);
    }
  }

  async function removeItem() {
    if (!activeItem) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/itineraries/${itinerary.id}/items/${activeItem.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Couldn't remove this item.");
      }
      setItems((prev) => prev.filter((i) => i.id !== activeItem.id));
      toast.success("Removed from your itinerary.");
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setMutating(false);
    }
  }

  const byDay = new Map<number, ItineraryItem[]>();
  for (const item of items) {
    if (!byDay.has(item.dayIndex)) byDay.set(item.dayIndex, []);
    byDay.get(item.dayIndex)!.push(item);
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-foreground mb-1">{itinerary.title}</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground-muted mb-8">
        {itinerary.startDate && itinerary.endDate && (
          <span>
            {new Date(`${itinerary.startDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            {" – "}
            {new Date(`${itinerary.endDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
          </span>
        )}
        {itinerary.estimatedCost != null && (
          <span>{itinerary.startDate ? "· " : ""}Estimated cost: ${itinerary.estimatedCost}</span>
        )}
      </div>

      <div className="space-y-10">
        {Array.from(byDay.entries()).map(([dayIndex, dayItems]) => (
          <div key={dayIndex}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">{dayLabel(itinerary, dayIndex)}</h2>
            <div className="space-y-3">
              {dayItems
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="w-full flex gap-4 text-left rounded-[var(--radius-md)] p-2 -m-2 hover:bg-surface-sunken transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground-muted w-16 shrink-0 pt-0.5">{item.startTime}</span>
                    {item.images[0] && (
                      <div className="relative h-14 w-14 rounded-[var(--radius-sm)] overflow-hidden shrink-0 bg-surface-sunken">
                        <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 border-l-2 border-border pl-4 pb-2 min-w-0">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.notes && <p className="text-sm text-foreground-muted mt-0.5 line-clamp-2">{item.notes}</p>}
                      {item.estimatedCost != null && item.estimatedCost > 0 && (
                        <p className="text-xs text-foreground-subtle mt-0.5">${item.estimatedCost}</p>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-ember" />
          <h2 className="font-display text-lg font-semibold text-foreground">Ask for changes</h2>
        </div>
        <p className="text-sm text-foreground-muted mb-4">
          {"Tell it what to change — \"swap Tuesday's lunch for something cheaper\" or \"remove the museum on day 2\"."}
        </p>

        {chatMessages.length > 0 && (
          <div ref={chatLogRef} className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[var(--radius-md)] px-3.5 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-forest text-white"
                      : "bg-surface-sunken text-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-sunken rounded-[var(--radius-md)] px-3.5 py-2">
                  <Spinner />
                </div>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendChatMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="What would you like to change?"
            disabled={chatLoading}
            className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-forest/40 disabled:opacity-50"
          />
          <Button type="submit" size="icon" disabled={!chatInput.trim()} loading={chatLoading} aria-label="Send">
            {!chatLoading && <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={closeModal}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-surface rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {activeItem.images.length > 0 ? (
              <div className="relative aspect-[4/3] bg-surface-sunken">
                <Image src={activeItem.images[imageIndex]} alt={activeItem.title} fill className="object-cover" />
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
                {activeItem.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImageIndex((i) => (i - 1 + activeItem.images.length) % activeItem.images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                    <button
                      onClick={() => setImageIndex((i) => (i + 1) % activeItem.images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {activeItem.images.map((_, i) => (
                        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === imageIndex ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-6 pb-0">
                <div />
                <button onClick={closeModal} aria-label="Close" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-surface-sunken">
                  <X className="h-4 w-4 text-foreground-muted" />
                </button>
              </div>
            )}

            <div className="p-6">
              <p className="text-xs font-medium text-foreground-subtle mb-1">{activeItem.startTime}</p>
              <h3 className="font-display text-2xl font-semibold text-foreground mb-2">{activeItem.title}</h3>
              {activeItem.notes && <p className="text-sm text-foreground-muted mb-3">{activeItem.notes}</p>}
              {activeItem.estimatedCost != null && activeItem.estimatedCost > 0 && (
                <p className="text-sm font-semibold text-foreground mb-4">${activeItem.estimatedCost}</p>
              )}

              {activeItem.experienceId && (
                <Link
                  href={`/experience/${activeItem.experienceId}`}
                  className="text-sm text-ember font-medium hover:underline block mb-4"
                >
                  View full details
                </Link>
              )}

              {alternatives === null ? (
                <div className="flex gap-2">
                  {canSwap && (
                    <Button variant="outline" className="flex-1" onClick={loadAlternatives} loading={loadingAlternatives}>
                      {!loadingAlternatives && <Repeat className="h-4 w-4" />} Swap this
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={removeItem} loading={mutating}>
                    {!mutating && <Trash2 className="h-4 w-4" />} Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Swap for something else</p>
                  <button
                    onClick={() => applySwap(null)}
                    disabled={mutating}
                    className="w-full text-left text-sm text-foreground-muted border border-dashed border-border-strong rounded-[var(--radius-md)] px-4 py-3 hover:bg-surface-sunken disabled:opacity-50"
                  >
                    No event — leave this slot free
                  </button>
                  {alternatives.length === 0 && (
                    <p className="text-sm text-foreground-muted">No other real places found nearby right now.</p>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {alternatives.map((alt) => (
                      <button
                        key={alt.experienceId}
                        onClick={() => applySwap(alt)}
                        disabled={mutating}
                        className="w-full flex gap-3 text-left rounded-[var(--radius-md)] border border-border p-2 hover:bg-surface-sunken disabled:opacity-50"
                      >
                        {alt.images[0] ? (
                          <div className="relative h-14 w-14 rounded-[var(--radius-sm)] overflow-hidden shrink-0 bg-surface-sunken">
                            <Image src={alt.images[0]} alt={alt.title} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-[var(--radius-sm)] shrink-0 bg-surface-sunken" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{alt.title}</p>
                          <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                            {alt.rating && (
                              <span className="inline-flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" /> {alt.rating.toFixed(1)}
                              </span>
                            )}
                            {alt.priceEstimate != null && alt.priceEstimate > 0 && <span>${alt.priceEstimate}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {mutating && (
                    <div className="flex justify-center py-2">
                      <Spinner />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
