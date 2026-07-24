"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Comment = {
  id: string;
  texte: string;
  created_at: string;
  user_id: string;
  users: { pseudo: string; avatar_url: string | null } | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function CommentSection({ dealId, userId }: { dealId: string; userId: string | null | undefined }) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function load() {
    const { data } = await supabase
      .from("comments")
      .select("id, texte, created_at, user_id, users:user_id (pseudo, avatar_url)")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    setComments((data as unknown as Comment[]) ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (!text.trim()) return;

    const { error } = await supabase
      .from("comments")
      .insert({ user_id: userId, deal_id: dealId, texte: text.trim() });

    if (!error) {
      setText("");
      load();
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-ink/60 mb-2">Commentaires ({comments.length})</p>

      {userId ? (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="flex-1 rounded border border-ink/20 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-teal text-white px-4 py-2 text-sm font-medium">
            Publier
          </button>
        </form>
      ) : (
        <p className="text-sm mb-4">
          <a href="/connexion" className="text-teal underline">
            Connecte-toi
          </a>{" "}
          pour commenter.
        </p>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-ink/50">Aucun commentaire pour l&apos;instant.</p>
      )}

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold text-ink/60 overflow-hidden shrink-0">
              {c.users?.avatar_url ? (
                <img src={c.users.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                c.users?.pseudo?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.users?.pseudo}</span>
                <span className="text-xs text-ink/40">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-ink/80">{c.texte}</p>
              {c.user_id === userId && (
                <button onClick={() => handleDelete(c.id)} className="text-xs text-tag mt-0.5">
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
