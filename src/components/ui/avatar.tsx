import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // A thin ring in the brand gradient: one of the small signatures that make the inside Zolo's own.
  if (src) {
    return (
      <span className={cn("ring-brand inline-block shrink-0", className)}>
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size - 4, height: size - 4 }}
        />
      </span>
    );
  }

  return (
    <span className={cn("ring-brand inline-block shrink-0", className)}>
      <span
        className="flex items-center justify-center rounded-full bg-foreground font-semibold text-background"
        style={{ width: size - 4, height: size - 4, fontSize: size * 0.38 }}
      >
        {initials || "?"}
      </span>
    </span>
  );
}
