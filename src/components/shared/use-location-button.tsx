"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentLocation } from "@/lib/hooks/use-current-location";
import type { GeocodeResult } from "@/services/providers/types";

/**
 * "Use my current location" -- the one place in the app that actually
 * triggers the browser's geolocation permission prompt, always from a direct
 * click, never on mount. Resolves to the same GeocodeResult shape the manual
 * city-search autocomplete produces, so callers (onboarding, profile) can
 * treat both entry points identically.
 */
export function UseLocationButton({
  onLocated,
  className,
}: {
  onLocated: (result: GeocodeResult) => void;
  className?: string;
}) {
  const { locate, status } = useCurrentLocation();
  const [resolving, setResolving] = useState(false);

  const busy = status === "locating" || resolving;

  async function handleClick() {
    let position: GeolocationPosition;
    try {
      position = await locate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't determine your location.");
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { results: GeocodeResult[] };
      const result = json.results[0];
      if (!result) {
        toast.error("Couldn't match that to a city. Search for it below instead.");
        return;
      }
      onLocated(result);
    } catch {
      toast.error("Couldn't look up your city. Search for it below instead.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={handleClick} loading={busy}>
      {!busy && <LocateFixed className="h-3.5 w-3.5" />}
      {busy ? "Finding you..." : "Use my current location"}
    </Button>
  );
}
