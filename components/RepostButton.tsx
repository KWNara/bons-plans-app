"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  dealId: string;
  userId: string | null | undefined;
  initialReposted: boolean;
  initialCount: number;
  allowComment?: boolean;
};

export function RepostButton({ dealId, userId, initialReposted, initialCount, allowComment }: Props) {
  const router = useRouter();
  const [reposted, setReposted] = useState(initialReposted);
  const [count, setCount] = useState(initialCount);
  const [composing, setComposing] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function removeRepost() {
    if (busy) return;
    setBusy(true);
    setReposted(false);
    setCount((c) => c - 1);
    await supabase.from("reposts").delete().eq("user_id", userId!).eq("deal_id", dealId);
    setBusy(false);
  }

  async function addRepost(withComment: string | null) {
    setBusy(true);
    setReposted(true);
    setCount((c) => c + 1);
    setComposing(false);
    setComment("");
    await supabase
      .from("reposts")
      .insert({ user_id: userId!, deal_id: dealId, commentaire_ajoute: withComment });
    setBusy(false);
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (reposted) {
      removeRepost();
      return;
    }
    if (allowComment) {
      setComposing(true);
      return;
    }
    addRepost(null);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="press flex items-center gap-1.5 text-sm text-ink/60 -m-1.5 p-1.5 rounded-full hover:bg-teal/5"
      >
        <Repeat2 size={18} className={reposted ? "text-teal" : ""} />
        <span className={reposted ? "text-teal font-medium" : ""}>{count}</span>
      </button>

      {composing && (
        <div className="mt-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajouter un commentaire (optionnel)"
            rows={2}
            className="w-full rounded-control border border-ink/15 px-3 py-2 text-sm focus:border-teal"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => addRepost(comment.trim() || null)}
              className="press text-sm bg-teal text-white px-3 py-1.5 rounded-control font-medium"
            >
              Repartager
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="press text-sm text-ink/50 px-3 py-1.5"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
