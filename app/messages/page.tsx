"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessagesSquare, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Avatar } from "@/components/ui/Avatar";

type Message = {
  id: string;
  expediteur: string;
  destinataire: string;
  texte: string | null;
  deal_id: string | null;
  lu: boolean;
  created_at: string;
};

type Conversation = {
  interlocuteur: { id: string; pseudo: string; avatar_url: string | null };
  dernier: Message;
  nonLus: number;
};

export default function MessagesPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const charger = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id, expediteur, destinataire, texte, deal_id, lu, created_at")
      .or(`expediteur.eq.${user.id},destinataire.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      setState("error");
      return;
    }

    const messages = (data as Message[]) ?? [];

    // Les messages arrivent à plat : on les regroupe par interlocuteur pour
    // reconstituer les conversations, le premier rencontré étant le plus
    // récent grâce au tri décroissant.
    const parInterlocuteur = new Map<string, { dernier: Message; nonLus: number }>();

    for (const m of messages) {
      const autre = m.expediteur === user.id ? m.destinataire : m.expediteur;
      const courant = parInterlocuteur.get(autre);
      const nonLu = m.destinataire === user.id && !m.lu ? 1 : 0;

      if (!courant) {
        parInterlocuteur.set(autre, { dernier: m, nonLus: nonLu });
      } else {
        courant.nonLus += nonLu;
      }
    }

    const ids = [...parInterlocuteur.keys()];

    if (ids.length === 0) {
      setConversations([]);
      setState("ready");
      return;
    }

    const { data: profils, error: profilsError } = await supabase
      .from("users")
      .select("id, pseudo, avatar_url")
      .in("id", ids);

    if (profilsError) {
      setState("error");
      return;
    }

    const liste: Conversation[] = [];
    for (const profil of profils ?? []) {
      const entree = parInterlocuteur.get(profil.id);
      if (entree) liste.push({ interlocuteur: profil, ...entree });
    }

    liste.sort(
      (a, b) => new Date(b.dernier.created_at).getTime() - new Date(a.dernier.created_at).getTime()
    );

    setConversations(liste);
    setState("ready");
  }, [router]);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <Link
          href="/compte"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-surface"
          aria-label="Retour au compte"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-extrabold text-ink">Messages</h1>
          <Link
            href="/amis"
            className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-surface shrink-0"
          >
            <UserPlus size={15} />
            Mes amis
          </Link>
        </div>

        {state === "loading" && (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        )}

        {state === "error" && (
          <ErrorState
            title="Chargement impossible"
            description="Tes conversations n'ont pas pu être récupérées."
            onRetry={() => {
              setState("loading");
              charger();
            }}
          />
        )}

        {state === "ready" && conversations.length === 0 && (
          <EmptyState
            icon={MessagesSquare}
            title="Aucune conversation"
            description="Ajoute des amis pour leur partager tes trouvailles et en discuter."
            action={
              <Link
                href="/amis"
                className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
              >
                Trouver mes amis
              </Link>
            }
          />
        )}

        {state === "ready" && conversations.length > 0 && (
          <ul className="space-y-2.5">
            {conversations.map(({ interlocuteur, dernier, nonLus }) => (
              <li key={interlocuteur.id}>
                <Link
                  href={`/messages/${interlocuteur.id}`}
                  className="press flex items-center gap-3 bg-surface rounded-card shadow-soft border border-ink/10 p-3"
                >
                  <Avatar pseudo={interlocuteur.pseudo} url={interlocuteur.avatar_url} size={44} />

                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">
                      {interlocuteur.pseudo}
                    </span>
                    <span className="block text-sm text-ink/70 truncate">
                      {dernier.texte ?? "A partagé un bon plan"}
                    </span>
                  </span>

                  {nonLus > 0 && (
                    <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-tag text-white text-xs font-bold flex items-center justify-center">
                      {nonLus > 9 ? "9+" : nonLus}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
