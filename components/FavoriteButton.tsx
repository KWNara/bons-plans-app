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
  onToggled?: (favorited: boolean) => void;
};

export function FavoriteButton({ dealId, userId, initialFavorited, className, onToggled }: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);

  // Les favoris de l'utilisateur arrivent après le premier rendu des cartes.
  const [syncedFavorited, setSyncedFavorited] = useState(initialFavorited);

  if (initialFavorited !== syncedFavorited) {
    setSyncedFavorited(initialFavorited);
    setFavorited(initialFavorited);
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (busy) return;
    setBusy(true);

    const wasFavorited = favorited;
    setFavorited(!wasFavorited);
    onToggled?.(!wasFavorited);

    if (!wasFavorited) {
      setPop(true);
      setTimeout(() => setPop(false), 320);
    }

    const { error } = wasFavorited
      ? await supabase.from("favorites").delete().eq("user_id", userId).eq("deal_id", dealId)
      : await supabase.from("favorites").insert({ user_id: userId, deal_id: dealId });

    if (error) {
      setFavorited(wasFavorited);
      onToggled?.(wasFavorited);
    }

    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`press ${className ?? ""}`}
    >
      <Bookmark
        size={16}
        className={`${favorited ? "fill-ink text-ink" : "text-ink"} ${pop ? "animate-pop" : ""}`}
      />
    </button>
  );
}
