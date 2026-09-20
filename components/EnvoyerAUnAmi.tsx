"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Check, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chargerRelations, type Ami } from "@/lib/amis";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  dealId: string;
  userId: string | null | undefined;
};

export function EnvoyerAUnAmi({ dealId, userId }: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [amis, setAmis] = useState<Ami[] | null>(null);
  const [envoiVers, setEnvoiVers] = useState<string | null>(null);
  const [envoyes, setEnvoyes] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const titreId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }

    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert || !userId || amis !== null) return;

    chargerRelations(userId)
      .then(({ amis }) => setAmis(amis))
      .catch(() => setErreur("Ta liste d'amis n'a pas pu être chargée."));
  }, [ouvert, userId, amis]);

  function ouvrir() {
    if (!userId) {
      router.push("/connexion");
      return;
    }
    setOuvert(true);
  }

  async function envoyer(ami: Ami) {
    if (envoiVers) return;

    setErreur(null);
    setEnvoiVers(ami.id);

    const { error } = await supabase
      .from("messages")
      .insert({ expediteur: userId!, destinataire: ami.id, deal_id: dealId });

    setEnvoiVers(null);

    if (error) {
      setErreur("L'envoi a échoué. Réessaie.");
      return;
    }

    setEnvoyes((prev) => [...prev, ami.id]);
  }

  return (
    <>
      <button
        onClick={ouvrir}
        aria-label="Envoyer ce bon plan à un ami"
        className="press flex items-center gap-1.5 text-sm text-ink/70 -m-1.5 p-1.5 rounded-full hover:bg-teal/5"
      >
        <Send size={18} />
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-contrast/40 backdrop-blur-sm p-6"
          onClick={() => setOuvert(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titreId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm my-auto max-h-full overflow-y-auto rounded-card bg-paper p-5 shadow-raised outline-none"
          >
            <h2 id={titreId} className="text-lg font-extrabold text-ink mb-1">
              Envoyer à un ami
            </h2>
            <p className="text-sm text-ink/70 mb-4">
              Le bon plan apparaîtra dans votre conversation.
            </p>

            {erreur && <p className="text-tag text-sm mb-3">{erreur}</p>}

            {amis === null && (
              <p className="flex items-center gap-2 text-sm text-ink/70 py-4">
                <Spinner size={14} /> Chargement de tes amis…
              </p>
            )}

            {amis !== null && amis.length === 0 && (
              <div className="text-center py-4">
                <span className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
                  <Users size={20} className="text-teal" />
                </span>
                <p className="text-sm text-ink/70 mb-4">
                  Tu n&apos;as pas encore d&apos;amis sur Déniche.
                </p>
                <Link
                  href="/amis"
                  className="press inline-block rounded-control bg-teal text-white px-4 py-2.5 text-sm font-semibold shadow-soft"
                >
                  Trouver mes amis
                </Link>
              </div>
            )}

            {amis !== null && amis.length > 0 && (
              <ul className="space-y-2">
                {amis.map((ami) => {
                  const dejaEnvoye = envoyes.includes(ami.id);
                  return (
                    <li key={ami.id} className="flex items-center gap-3">
                      {ami.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ami.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-full bg-teal/10 text-teal font-semibold flex items-center justify-center shrink-0">
                          {ami.pseudo[0]?.toUpperCase() ?? "?"}
                        </span>
                      )}
                      <span className="flex-1 min-w-0 text-sm font-medium text-ink truncate">
                        {ami.pseudo}
                      </span>
                      <button
                        onClick={() => envoyer(ami)}
                        disabled={envoiVers === ami.id || dejaEnvoye}
                        className={`press inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-semibold shrink-0 disabled:opacity-60 ${
                          dejaEnvoye ? "bg-teal/10 text-teal" : "bg-teal text-white shadow-soft"
                        }`}
                      >
                        {envoiVers === ami.id ? (
                          <Spinner size={14} />
                        ) : dejaEnvoye ? (
                          <Check size={14} />
                        ) : (
                          <Send size={14} />
                        )}
                        {dejaEnvoye ? "Envoyé" : "Envoyer"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              onClick={() => setOuvert(false)}
              className="press w-full rounded-control border border-ink/15 py-2.5 mt-5 text-sm font-medium text-ink"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
