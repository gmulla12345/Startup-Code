/**
 * Zero-config location preview using the OpenStreetMap embed export, which
 * requires no API key. The full interactive Map page (src/app/(app)/map)
 * uses MapLibre GL for real pan/zoom/marker interaction — this is just a
 * lightweight "here's roughly where it is" preview for the detail page.
 */
export function MiniMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const delta = 0.01;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden border border-border">
      <iframe title={`Map showing ${label}`} src={src} className="w-full h-56 border-0" loading="lazy" />
    </div>
  );
}
