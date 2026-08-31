/**
 * Required disclosure per Google Maps Platform's Terms of Service: apps that
 * display Places data (search results, photos, place details) without also
 * showing that data on a Google Map must show a "Powered by Google"
 * attribution. Our map widgets use OpenStreetMap/MapLibre, not Google Maps,
 * so this attribution is required wherever Places-sourced content appears —
 * placed here as a persistent, site-wide badge rather than repeated on every
 * card, since virtually all catalog content is Google Places-sourced.
 */
export function GoogleAttribution() {
  return (
    <div className="fixed bottom-2 right-2 z-40 pointer-events-none">
      <span className="text-[10px] text-foreground-subtle bg-surface/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
        Powered by Google
      </span>
    </div>
  );
}
