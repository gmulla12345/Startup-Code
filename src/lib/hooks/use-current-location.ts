"use client";

import { useCallback, useState } from "react";

export type LocationStatus = "idle" | "locating" | "error";

/**
 * Thin wrapper around navigator.geolocation, used only in direct response to
 * a user clicking a "use my location" control -- never called on mount.
 * Auto-prompting for location the instant a page loads is exactly the
 * pattern browsers actively discourage (Chrome throttles/ignores permission
 * prompts not tied to a user gesture) and is bad practice regardless: people
 * should see why we want it before the OS-level permission dialog appears.
 */
export function useCurrentLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        const message = "Location isn't supported on this browser.";
        setStatus("error");
        setError(message);
        reject(new Error(message));
        return;
      }

      setStatus("locating");
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStatus("idle");
          resolve(position);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location access was denied. You can still search for your city below."
              : err.code === err.TIMEOUT
                ? "Finding your location took too long. Try again or search for your city."
                : "Couldn't determine your location. Try again or search for your city.";
          setStatus("error");
          setError(message);
          reject(err);
        },
        {
          // City-level accuracy is all discovery needs -- high accuracy asks
          // for GPS-grade precision, which is slower, drains more battery,
          // and buys nothing extra we'd actually use here.
          enableHighAccuracy: false,
          timeout: 10_000,
          // A position from the last 5 minutes is still a fine city-level
          // fix, and reusing it means an immediate re-click doesn't re-ask
          // the OS for a fresh fix.
          maximumAge: 5 * 60 * 1000,
        }
      );
    });
  }, []);

  return { locate, status, error };
}
