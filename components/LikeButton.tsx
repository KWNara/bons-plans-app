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
};

export function LikeButton({ dealId, userId, initialLiked, initialCount }: Props) {
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

    if (liked) {
      setLiked(false);
      setCount((c) => c - 1);
      await supabase.from("likes").delete().eq("user_id", userId).eq("deal_id", dealId);
    } else {
      setLiked(true);
      setCount((c) => c + 1);
      setPop(true);
      setTimeout(() => setPop(false), 320);
      await supabase.from("likes").insert({ user_id: userId, deal_id: dealId });
    }
    setBusy(false);
  }

  return (
    <button onClick={toggle} className="press flex items-center gap-1.5 text-sm text-ink/60 -m-1.5 p-1.5 rounded-full hover:bg-tag/5">
      <Heart
        size={18}
        className={`${liked ? "fill-tag text-tag" : ""} ${pop ? "animate-pop" : ""}`}
      />
      <span className={liked ? "text-tag font-medium" : ""}>{count}</span>
    </button>
  );
}
