"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  dealId: string;
  userId: string | null | undefined;
  initialLiked: boolean;
  initialCount: number;
  // Le fil remonte les cartes au changement d'onglet : sans remonter l'état au
  // parent, un like tout juste posé réapparaîtrait comme non-liké.
  onToggled?: (liked: boolean) => void;
};

export function LikeButton({ dealId, userId, initialLiked, initialCount, onToggled }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (busy) return;
    setBusy(true);

    const wasLiked = liked;
    const previousCount = count;

    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? c - 1 : c + 1));
    onToggled?.(!wasLiked);

    if (!wasLiked) {
      setPop(true);
      setTimeout(() => setPop(false), 320);
    }

    const { error } = wasLiked
      ? await supabase.from("likes").delete().eq("user_id", userId).eq("deal_id", dealId)
      : await supabase.from("likes").insert({ user_id: userId, deal_id: dealId });

    // Sans ce retour en arrière, l'interface affirmerait que le like est
    // enregistré alors qu'il ne l'est pas (hors ligne, RLS, base injoignable).
    if (error) {
      setLiked(wasLiked);
      setCount(previousCount);
      onToggled?.(wasLiked);
    }

    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? `Retirer mon like (${count})` : `Liker (${count})`}
      className="press flex items-center gap-1.5 text-sm text-ink/70 -m-1.5 p-1.5 rounded-full hover:bg-tag/5"
    >
      <Heart
        size={18}
        className={`${liked ? "fill-tag text-tag" : ""} ${pop ? "animate-pop" : ""}`}
      />
      <span className={liked ? "text-tag font-medium" : ""}>{count}</span>
    </button>
  );
}
