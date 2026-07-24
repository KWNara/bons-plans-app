"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  dealId: string;
  userId: string | null | undefined;
  initialFavorited: boolean;
  className?: string;
};

export function FavoriteButton({ dealId, userId, initialFavorited, className }: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (busy) return;
    setBusy(true);

    if (favorited) {
      setFavorited(false);
      await supabase.from("favorites").delete().eq("user_id", userId).eq("deal_id", dealId);
    } else {
      setFavorited(true);
      await supabase.from("favorites").insert({ user_id: userId, deal_id: dealId });
    }
    setBusy(false);
  }

  return (
    <button onClick={toggle} className={className}>
      <Bookmark size={16} className={favorited ? "fill-ink text-ink" : "text-ink"} />
    </button>
  );
}
