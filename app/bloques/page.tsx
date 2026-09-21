"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chargerBlocages, debloquer, type Bloque } from "@/lib/blocages";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";

export default function ComptesBloquesPage() {
  const router = useRouter();
  const [moi, setMoi] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [blocages, setBlocages] = useState<Bloque[]>([]);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async (uid: string) => {
    try {
      setBlocages(await chargerBlocages(uid));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/connexion");
        return;
      }
      setMoi(user.id);
      recharger(user.id);
    });
  }, [router, recharger]);

  async function retirer(relationId: string) {
    if (occupe || !moi) return;

    setErreur(null);
    setOccupe(relationId);

    const { error } = await debloquer(relationId);

    setOccupe(null);

    if (error) {
      setErreur("Le déblocage a échoué.");
      return;
    }

    await recharger(moi);
  }

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

        <h1 className="text-2xl font-extrabold text-ink mb-1">Comptes bloqués</h1>
        <p className="text-sm text-ink/70 mb-5">
          Ces personnes ne peuvent plus t&apos;envoyer de demande d&apos;ami ni de message.
        </p>

        {erreur && <p className="text-tag text-sm mb-3">{erreur}</p>}

        {state === "loading" && (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        )}

        {state === "error" && (
          <ErrorState
            title="Chargement impossible"
            description="Tes comptes bloqués n'ont pas pu être récupérés."
            onRetry={() => {
              setState("loading");
              if (moi) recharger(moi);
            }}
          />
        )}

        {state === "ready" && blocages.length === 0 && (
          <EmptyState
            icon={ShieldOff}
            title="Aucun compte bloqué"
            description="Tu peux bloquer quelqu'un depuis son profil."
          />
        )}

        {state === "ready" && blocages.length > 0 && (
          <ul className="space-y-2.5">
            {blocages.map((b) => (
              <li
                key={b.relationId}
                className="flex items-center gap-3 bg-surface rounded-card shadow-soft border border-ink/10 p-3"
              >
                <Avatar pseudo={b.pseudo} url={b.avatar_url} />
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                  {b.pseudo}
                </span>
                <button
                  onClick={() => retirer(b.relationId)}
                  disabled={occupe === b.relationId}
                  className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 px-3 py-2 text-sm font-medium text-ink shrink-0 disabled:opacity-50"
                >
                  {occupe === b.relationId ? <Spinner size={14} /> : <ShieldCheck size={14} />}
                  Débloquer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
