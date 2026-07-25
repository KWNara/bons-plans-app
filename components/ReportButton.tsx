"use client";

import { useState } from "react";
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
};

export function ReportButton({ targetType, targetId, userId, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("contenu_trompeur");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "already">("idle");
  const [error, setError] = useState<string | null>(null);

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
        setError(insertError.message);
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
        className={className ?? "flex items-center gap-1 text-sm text-ink/50"}
      >
        <Flag size={16} />
        Signaler
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6">
          <div className="w-full max-w-sm rounded-xl bg-paper p-5">
            {status === "sent" ? (
              <>
                <p className="text-ink mb-4">Merci, ton signalement a été transmis à l&apos;équipe.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full rounded bg-teal text-white py-2 font-medium"
                >
                  Fermer
                </button>
              </>
            ) : status === "already" ? (
              <>
                <p className="text-ink mb-4">Tu as déjà signalé ce contenu.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full rounded bg-ink/10 text-ink py-2 font-medium"
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-ink mb-3">Signaler</h2>

                <fieldset className="mb-3">
                  <legend className="text-sm text-ink/70 mb-1">Motif</legend>
                  <div className="space-y-1">
                    {MOTIFS.map((m) => (
                      <label key={m.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="motif"
                          checked={motif === m.value}
                          onChange={() => setMotif(m.value)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block mb-4">
                  <span className="text-sm text-ink/70">Précision (optionnel)</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded border border-ink/20 px-3 py-2 text-sm"
                  />
                </label>

                {error && <p className="text-tag text-sm mb-3">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="w-1/2 rounded border border-ink/20 text-ink py-2 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={status === "sending"}
                    className="w-1/2 rounded bg-tag text-white py-2 font-medium disabled:opacity-50"
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
