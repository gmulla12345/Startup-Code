"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import type { Experience } from "@/types/database";

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

export function DiscoveryMap({
  experiences,
  center,
}: {
  experiences: Experience[];
  center: { latitude: number; longitude: number };
}) {
  const [selected, setSelected] = useState<Experience | null>(null);

  const viewState = useMemo(
    () => ({ longitude: center.longitude, latitude: center.latitude, zoom: 12 }),
    [center.latitude, center.longitude]
  );

  return (
    <div className="relative h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] w-full rounded-none md:rounded-[var(--radius-lg)] overflow-hidden">
      <Map initialViewState={viewState} mapStyle={MAP_STYLE} style={{ width: "100%", height: "100%" }}>
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        <Marker longitude={center.longitude} latitude={center.latitude} anchor="center">
          <div className="h-4 w-4 rounded-full bg-forest border-2 border-white shadow-md" />
        </Marker>

        {experiences.map((exp) => (
          <Marker
            key={exp.id}
            longitude={exp.longitude}
            latitude={exp.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(exp);
            }}
          >
            <button aria-label={exp.title} className="cursor-pointer">
              <MapPin
                className="h-8 w-8 drop-shadow-md"
                fill={exp.isHiddenGem ? "var(--gold)" : "var(--ember)"}
                color="white"
                strokeWidth={1.5}
              />
            </button>
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="top"
            onClose={() => setSelected(null)}
            closeButton={false}
            maxWidth="260px"
          >
            <Link href={`/experience/${selected.slug}`} className="block">
              {selected.images[0] && (
                <div
                  className="h-24 w-full rounded-[var(--radius-sm)] bg-cover bg-center mb-2"
                  style={{ backgroundImage: `url(${selected.images[0]})` }}
                />
              )}
              <p className="font-semibold text-sm text-foreground line-clamp-1">{selected.title}</p>
              <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                {selected.rating && (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" /> {selected.rating.toFixed(1)}
                  </span>
                )}
                <span>{formatPrice(selected.priceEstimate, selected.priceLevel)}</span>
              </div>
            </Link>
          </Popup>
        )}
      </Map>
    </div>
  );
}
