"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MOTIFS: { value: string; label: string }[] = [
  { value: "contenu_trompeur", label: "Contenu trompeur" },
  { value: "arnaque_suspectee", label: "Arnaque suspectée" },
  { value: "produit_non_conforme", label: "Produit non conforme" },
  { value: "contenu_inapproprie", label: "Contenu inapproprié" },
  { value: "doublon", label: "Doublon" },
  { value: "autre", label: "Autre" },
];

type Props = {
  targetType: "deal" | "merchant";
  targetId: string;
  userId: string | null | undefined;
  className?: string;
  iconOnly?: boolean;
};

export function ReportButton({ targetType, targetId, userId, className, iconOnly }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("contenu_trompeur");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "already">("idle");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Une boîte de dialogue doit pouvoir se fermer au clavier et rendre le
    // focus utilisable : sans ça, un utilisateur au clavier reste piégé
    // derrière la modale.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    // Empêche la page derrière la modale de défiler sous le doigt.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleOpen() {
    if (!userId) {
      router.push("/connexion");
      return;
    }
    setOpen(true);
  }

  async function handleSubmit() {
    setStatus("sending");
    setError(null);

    const payload =
      targetType === "deal"
        ? { deal_id: targetId, target_type: "deal" as const }
        : { merchant_id: targetId, target_type: "merchant" as const };

    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: userId,
      motif,
      reason: reason.trim() || null,
      ...payload,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setStatus("already");
      } else {
        setError("Ton signalement n'a pas pu être envoyé. Réessaie dans un instant.");
        setStatus("idle");
      }
      return;
    }

    setStatus("sent");
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Signaler"
        className={className ?? "press flex items-center gap-1.5 text-sm text-ink/60 hover:text-tag"}
      >
        <Flag size={iconOnly ? 17 : 16} />
        {!iconOnly && "Signaler"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-6 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm my-auto max-h-full overflow-y-auto rounded-card bg-paper p-5 shadow-raised outline-none"
          >
            <h2 id={titleId} className="sr-only">
              Signaler ce contenu
            </h2>
            {status === "sent" ? (
              <>
                <p className="text-ink mb-4">Merci, ton signalement a été transmis à l&apos;équipe.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="press w-full rounded-control bg-teal text-white py-2.5 font-medium"
                >
                  Fermer
                </button>
              </>
            ) : status === "already" ? (
              <>
                <p className="text-ink mb-4">Tu as déjà signalé ce contenu.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="press w-full rounded-control bg-ink/10 text-ink py-2.5 font-medium"
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-ink mb-3">Signaler</h2>

                <fieldset className="mb-3">
                  <legend className="text-sm text-ink/60 mb-2">Motif</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {MOTIFS.map((m) => (
                      <button
                        type="button"
                        key={m.value}
                        onClick={() => setMotif(m.value)}
                        className={`press rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                          motif === m.value
                            ? "bg-ink text-white border-ink"
                            : "bg-white text-ink/70 border-ink/15"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="block mb-4">
                  <span className="text-sm text-ink/60">Précision (optionnel)</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-control border border-ink/15 px-3 py-2 text-sm focus:border-teal"
                  />
                </label>

                {error && <p className="text-tag text-sm mb-3">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="press w-1/2 rounded-control border border-ink/15 text-ink py-2.5 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={status === "sending"}
                    className="press w-1/2 rounded-control bg-tag text-white py-2.5 font-medium disabled:opacity-50"
                  >
                    {status === "sending" ? "..." : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
