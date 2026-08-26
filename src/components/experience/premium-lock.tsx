import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricing } from "@/lib/config/pricing";
import { brand } from "@/lib/config/brand";

export function PremiumLock({ title, image }: { title: string; image?: string }) {
  return (
    <div className="relative rounded-[var(--radius-lg)] overflow-hidden">
      <div className="relative aspect-[16/9] w-full">
        {image && <Image src={image} alt={title} fill className="object-cover blur-md scale-110" />}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-6">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-display text-xl font-semibold text-white mb-2">This is a Premium experience</h3>
          <p className="text-white/80 text-sm mb-5 max-w-sm">
            Upgrade to {brand.name} Premium (${pricing.premium.priceMonthly}/mo) to unlock exclusive experiences like this one.
          </p>
          <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
            <Link href="/profile/upgrade">Upgrade to Premium</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
