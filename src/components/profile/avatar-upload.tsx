"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function AvatarUpload({
  avatarUrl,
  name,
  size = 72,
}: {
  avatarUrl: string | null;
  name: string;
  size?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image is too large (5MB max).");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't update your photo.");
      toast.success("Profile photo updated.");
      router.refresh();
    } catch (err) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : "Couldn't update your photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Avatar src={preview ?? avatarUrl} name={name} size={size} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-forest text-white flex items-center justify-center border-2 border-surface shadow-sm hover:bg-forest/90 disabled:opacity-60"
      >
        {uploading ? <Spinner className="h-3.5 w-3.5 text-white" /> : <Camera className="h-3.5 w-3.5" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
