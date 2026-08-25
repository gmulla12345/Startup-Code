"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateTripButton({ destinationCity, destinationCountry }: { destinationCity: string; destinationCountry: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationCity, destinationCountry }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to create trip.");
      toast.success(`Trip to ${destinationCity} created — find it in Trips.`);
      router.push("/trips");
    } catch {
      toast.error("Couldn't create this trip. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="shrink-0">
      <Plus className="h-4 w-4" /> {loading ? "Adding..." : `Plan a trip to ${destinationCity}`}
    </Button>
  );
}
