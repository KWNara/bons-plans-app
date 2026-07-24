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
      await supabase.from("likes").insert({ user_id: userId, deal_id: dealId });
    }
    setBusy(false);
  }

  return (
    <button onClick={toggle} className="flex items-center gap-1 text-sm">
      <Heart size={18} className={liked ? "fill-tag text-tag" : ""} />
      {count}
    </button>
  );
}
