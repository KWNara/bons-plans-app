"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Send, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";
import { discountLabel } from "@/lib/dealFormat";

type Message = {
  id: string;
  expediteur: string;
  destinataire: string;
  texte: string | null;
  deal_id: string | null;
  created_at: string;
  deals: {
    id: string;
    titre: string;
    photos: string[];
    prix_avant: number | null;
    prix_apres: number | null;
    reduction_pourcentage: number | null;
  } | null;
};

type Interlocuteur = { id: string; pseudo: string; avatar_url: string | null };

const SELECTION =
  "id, expediteur, destinataire, texte, deal_id, created_at, deals:deal_id (id, titre, photos, prix_avant, prix_apres, reduction_pourcentage)";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const autre = params.id;

  const [moi, setMoi] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "error" | "non-ami" | "ready">("loading");
  const [interlocuteur, setInterlocuteur] = useState<Interlocuteur | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const charger = useCallback(
    async (uid: string) => {
      const [{ data: profil }, { data: amitie }, { data: msgs, error }] = await Promise.all([
        supabase.from("users").select("id, pseudo, avatar_url").eq("id", autre).maybeSingle(),
        supabase
          .from("friendships")
          .select("statut")
          .eq("statut", "acceptee")
          .or(
            `and(user_a.eq.${uid < autre ? uid : autre},user_b.eq.${uid < autre ? autre : uid})`
          )
          .maybeSingle(),
        supabase
          .from("messages")
          .select(SELECTION)
          .or(
            `and(expediteur.eq.${uid},destinataire.eq.${autre}),and(expediteur.eq.${autre},destinataire.eq.${uid})`
          )
          .order("created_at", { ascending: true }),
      ]);

      if (error) {
        setState("error");
        return;
      }

      setInterlocuteur(profil ?? null);
      setMessages((msgs as unknown as Message[]) ?? []);

      // L'amitié conditionne l'envoi côté base : autant l'annoncer clairement
      // plutôt que de laisser l'utilisateur écrire un message qui sera rejeté.
      setState(amitie ? "ready" : "non-ami");

      // Les messages reçus sont marqués comme lus à l'ouverture du fil.
      await supabase
        .from("messages")
        .update({ lu: true })
        .eq("destinataire", uid)
        .eq("expediteur", autre)
        .eq("lu", false);
    },
    [autre]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/connexion");
        return;
      }
      setMoi(user.id);
      charger(user.id);
    });
  }, [router, charger]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Les nouveaux messages arrivent sans rechargement : sans ça, une discussion
  // à deux obligerait chacun à rafraîchir la page pour voir les réponses.
  useEffect(() => {
    if (!moi || state !== "ready") return;

    const canal = supabase
      .channel(`conversation:${moi}:${autre}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const concerne =
            (m.expediteur === autre && m.destinataire === moi) ||
            (m.expediteur === moi && m.destinataire === autre);

          if (!concerne) return;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [moi, autre, state]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!moi || !texte.trim() || envoi) return;

    setErreur(null);
    setEnvoi(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({ expediteur: moi, destinataire: autre, texte: texte.trim() })
      .select(SELECTION)
      .single();

    setEnvoi(false);

    if (error) {
      setErreur("Ton message n'a pas pu être envoyé.");
      return;
    }

    setTexte("");
    setMessages((prev) =>
      prev.some((p) => p.id === (data as unknown as Message).id)
        ? prev
        : [...prev, data as unknown as Message]
    );
  }

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
        <div className="max-w-md mx-auto space-y-3">
          <Skeleton className="h-12 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <ErrorState
          title="Conversation indisponible"
          description="Les messages n'ont pas pu être récupérés."
          onRetry={() => {
            setState("loading");
            if (moi) charger(moi);
          }}
        />
      </main>
    );
  }

  if (state === "non-ami") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={UserX}
          title="Vous n'êtes pas amis"
          description="La messagerie est réservée aux personnes qui se sont mutuellement acceptées."
          action={
            <Link
              href="/amis"
              className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
            >
              Gérer mes amis
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-6 flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/messages"
            className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full hover:bg-surface shrink-0"
            aria-label="Retour aux messages"
          >
            <ChevronLeft size={20} className="text-ink" />
          </Link>
          {interlocuteur?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={interlocuteur.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-teal/10 text-teal font-semibold flex items-center justify-center shrink-0">
              {interlocuteur?.pseudo?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <h1 className="text-lg font-extrabold text-ink truncate">
            {interlocuteur?.pseudo ?? "Conversation"}
          </h1>
        </div>

        <div className="flex-1 space-y-2.5 mb-4">
          {messages.length === 0 && (
            <p className="text-sm text-ink/60 text-center py-8">
              Aucun message. Lance la discussion !
            </p>
          )}

          {messages.map((m) => {
            const deMoi = m.expediteur === moi;
            const badge = m.deals ? discountLabel(m.deals) : null;

            return (
              <div key={m.id} className={`flex ${deMoi ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-card px-3.5 py-2.5 ${
                    deMoi ? "bg-teal text-white" : "bg-surface border border-ink/10 text-ink"
                  }`}
                >
                  {m.deals && (
                    <Link
                      href={`/bons-plans/${m.deals.id}`}
                      className="press block rounded-control overflow-hidden bg-paper mb-2"
                    >
                      {m.deals.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.deals.photos[0]} alt="" className="w-full h-24 object-cover" />
                      )}
                      <span className="block px-2.5 py-2">
                        <span className="block text-sm font-semibold text-ink leading-snug">
                          {m.deals.titre}
                        </span>
                        {badge && (
                          <span className="inline-block mt-1 text-xs font-bold text-tag">
                            {badge}
                          </span>
                        )}
                      </span>
                    </Link>
                  )}

                  {m.texte && <p className="text-sm break-words">{m.texte}</p>}

                  <p className={`text-[11px] mt-1 ${deMoi ? "text-white/70" : "text-ink/60"}`}>
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={finRef} />
        </div>

        {erreur && <p className="text-tag text-sm mb-2">{erreur}</p>}

        <form onSubmit={envoyer} className="flex gap-2 sticky bottom-0 bg-paper pt-2">
          <label htmlFor="message" className="sr-only">
            Message
          </label>
          <input
            id="message"
            type="text"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Écris un message…"
            className="flex-1 rounded-control border border-ink/15 px-3.5 py-2.5 text-sm focus:border-teal transition-colors"
          />
          <button
            type="submit"
            disabled={envoi || !texte.trim()}
            aria-label="Envoyer"
            className="press w-11 rounded-control bg-teal text-white flex items-center justify-center disabled:opacity-40"
          >
            {envoi ? <Spinner size={16} /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </main>
  );
}
