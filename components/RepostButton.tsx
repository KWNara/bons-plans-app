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
      <button onClick={handleClick} className="flex items-center gap-1 text-sm">
        <Repeat2 size={18} className={reposted ? "text-teal" : ""} />
        {count}
      </button>

      {composing && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajouter un commentaire (optionnel)"
            rows={2}
            className="w-full rounded border border-ink/20 px-2 py-1 text-sm"
          />
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => addRepost(comment.trim() || null)}
              className="text-sm bg-teal text-white px-3 py-1 rounded"
            >
              Repartager
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="text-sm text-ink/50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
