"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export function ExperienceGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return <div className="aspect-[16/9] w-full rounded-[var(--radius-lg)] bg-surface-sunken" />;

  return (
    <div>
      <div className="relative aspect-[16/9] w-full rounded-[var(--radius-lg)] overflow-hidden bg-surface-sunken">
        <Image src={images[active]} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 800px" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 rounded-[var(--radius-sm)] overflow-hidden border-2",
                active === i ? "border-ember" : "border-transparent opacity-70"
              )}
            >
              <Image src={img} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
