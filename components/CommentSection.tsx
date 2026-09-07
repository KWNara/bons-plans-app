"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const [posting, setPosting] = useState(false);

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

    setPosting(true);
    const { error } = await supabase
      .from("comments")
      .insert({ user_id: userId, deal_id: dealId, texte: text.trim() });
    setPosting(false);

    if (!error) {
      setText("");
      load();
    }
  }

  async function handleDelete(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("comments").delete().eq("id", id);
  }

  return (
    <div className="mt-8 pt-6 border-t border-ink/10">
      <p className="text-sm font-semibold text-ink mb-3">Commentaires ({comments.length})</p>

      {userId ? (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="flex-1 rounded-control border border-ink/15 px-3.5 py-2.5 text-sm focus:border-teal"
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            aria-label="Publier"
            className="press rounded-control bg-teal text-white w-11 flex items-center justify-center disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      ) : (
        <p className="text-sm mb-5 rounded-control bg-white border border-ink/10 px-3.5 py-2.5">
          <a href="/connexion" className="text-teal underline font-medium">
            Connecte-toi
          </a>{" "}
          pour commenter.
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div className="flex flex-col items-center text-center py-8">
          <MessageCircle size={22} className="text-ink/20 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-ink/60">Sois le premier à commenter.</p>
        </div>
      )}

      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center text-xs font-bold text-teal overflow-hidden shrink-0">
              {c.users?.avatar_url ? (
                <img src={c.users.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                c.users?.pseudo?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{c.users?.pseudo}</span>
                <span className="text-xs text-ink/60">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-ink/75 break-words">{c.texte}</p>
              {c.user_id === userId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="press text-xs text-ink/60 hover:text-tag mt-0.5"
                >
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
