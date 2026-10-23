"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Crown, CalendarClock, CreditCard, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { STATUTS_EN_COURS } from "@/lib/abonnement";

// Lu via la fonction mon_abonnement() : ces colonnes ne sont plus lisibles
// directement, le statut de paiement d'un commerçant ne regardant que lui.
type Merchant = {
  plan: "gratuit" | "payant";
  statut: string | null;
  fin_de_periode: string | null;
  fin_programmee: string | null;
};

function dateLongue(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Le statut brut de Stripe ne doit jamais s'afficher tel quel à un commerçant.
const STATUS_LABELS: Record<string, string> = {
  past_due: "Ton dernier paiement a échoué. Stripe va réessayer automatiquement — pense à vérifier ta carte.",
  unpaid: "Ton abonnement est impayé. Mets à jour ton moyen de paiement pour le réactiver.",
  canceled: "Ton abonnement a été annulé.",
  incomplete: "Ton paiement n'a pas été finalisé.",
  incomplete_expired: "Ton paiement n'a pas été finalisé à temps.",
  paused: "Ton abonnement est en pause.",
};

export default function MonAbonnementPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
          <div className="max-w-md mx-auto">
            <Skeleton className="h-32 w-full rounded-card mb-4" />
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
        </main>
      }
    >
      <MonAbonnementContent />
    </Suspense>
  );
}

function MonAbonnementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("success") === "1";

  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Après un paiement, le webhook Stripe peut mettre quelques secondes à
  // arriver. On attend l'activation au lieu d'afficher « Gratuit / Passer en
  // Pro », ce qui pousserait le commerçant à payer une seconde fois.
  const [awaitingActivation, setAwaitingActivation] = useState(justPaid);
  const [activationEnRetard, setActivationEnRetard] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return null;
    }

    const { data: lignes, error: loadError } = await supabase.rpc("mon_abonnement");

    if (loadError) {
      setState("error");
      return null;
    }

    const data = (lignes as Merchant[] | null)?.[0];

    if (!data) {
      router.push("/compte");
      return null;
    }

    setMerchant(data);
    setState("ready");
    return data;
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!awaitingActivation) return;

    let cancelled = false;
    let attempts = 0;

    const timer = setInterval(async () => {
      attempts += 1;
      const data = await load();

      if (cancelled) return;

      // On abandonne au bout de ~30 s : laisser tourner indéfiniment donnerait
      // l'illusion d'un chargement. Mais le paiement, lui, a bien eu lieu : on
      // ne repropose surtout pas « Passer en Pro ».
      if (data?.plan === "payant") {
        setAwaitingActivation(false);
      } else if (attempts >= 10) {
        setAwaitingActivation(false);
        setActivationEnRetard(true);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [awaitingActivation, load]);

  async function handlePortal() {
    setError(null);
    setPortalLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/connexion");
      return;
    }

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();

      if (!res.ok) {
        setPortalLoading(false);
        setError(body.error ?? "Impossible d'ouvrir la gestion de l'abonnement. Réessaie.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setPortalLoading(false);
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
    }
  }

  const isPro = merchant?.plan === "payant";
  const statusMessage =
    merchant?.statut && merchant.statut !== "active" ? STATUS_LABELS[merchant.statut] : null;
  // Un abonnement impayé, incomplet ou en pause n'ouvre pas le Pro, mais il
  // existe toujours : sans accès au portail, le seul bouton proposé était
  // « Passer en Pro », qui créait un second abonnement.
  const abonnementEnCours = !!merchant?.statut && STATUTS_EN_COURS.includes(merchant.statut);

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

        <h1 className="text-2xl font-extrabold text-ink mb-5">Mon abonnement</h1>

        {state === "loading" && (
          <>
            <Skeleton className="h-32 w-full rounded-card mb-4" />
            <Skeleton className="h-11 w-full rounded-control" />
          </>
        )}

        {state === "error" && (
          <ErrorState
            title="Impossible de charger ton abonnement"
            description="La connexion au serveur a échoué."
            onRetry={() => {
              setState("loading");
              load();
            }}
          />
        )}

        {state === "ready" && (
          <>
            {awaitingActivation && (
              <div className="flex items-start gap-2.5 bg-teal/10 border border-teal/30 rounded-control px-4 py-3 mb-4">
                <Spinner size={16} className="text-teal shrink-0 mt-0.5" />
                <p className="text-sm text-ink/70 leading-relaxed">
                  Paiement reçu, activation de ton compte Pro en cours…
                </p>
              </div>
            )}

            {activationEnRetard && !isPro && (
              <div className="flex items-start gap-2.5 bg-marigold/15 border border-marigold/40 rounded-control px-4 py-3 mb-4">
                <AlertCircle size={16} className="text-tag shrink-0 mt-0.5" />
                <p className="text-sm text-ink leading-relaxed">
                  Ton paiement est bien reçu, mais l&apos;activation prend plus de temps que prévu.{" "}
                  <strong>Ne repaie pas</strong> : reviens sur cette page dans quelques minutes.
                </p>
              </div>
            )}

            <div
              className={`rounded-card p-5 mb-4 shadow-soft ${
                isPro ? "bg-gradient-to-br from-contrast to-contrast/80 text-white" : "bg-surface border border-ink/10"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isPro && <Crown size={16} className="text-marigold" />}
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isPro ? "text-white/70" : "text-ink/60"
                  }`}
                >
                  Plan actuel
                </p>
              </div>
              <p className={`text-xl font-extrabold mb-3 ${isPro ? "text-white" : "text-ink"}`}>
                {isPro ? "Pro · illimité" : "Gratuit"}
              </p>
              {!isPro && (
                <p className="text-sm text-ink/70 mb-1">Jusqu&apos;à 3 bons plans actifs simultanément.</p>
              )}

              {isPro && merchant?.fin_programmee ? (
                <p className="flex items-center gap-1.5 text-sm text-white/80">
                  <CalendarClock size={14} />
                  Résilié : ton Pro se termine le {dateLongue(merchant.fin_programmee)}
                </p>
              ) : (
                isPro &&
                merchant?.fin_de_periode && (
                  <p className="flex items-center gap-1.5 text-sm text-white/80">
                    <CalendarClock size={14} />
                    Renouvellement le {dateLongue(merchant.fin_de_periode)}
                  </p>
                )
              )}

              {statusMessage && (
                <p className="flex items-start gap-1.5 text-sm text-tag mt-3 bg-tag/10 rounded-control px-2.5 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {statusMessage}
                </p>
              )}
            </div>

            {error && <p className="text-tag text-sm mb-3">{error}</p>}

            {isPro || abonnementEnCours ? (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="press w-full flex items-center justify-center gap-2 rounded-control border border-ink/15 bg-surface text-ink py-3 font-semibold shadow-soft disabled:opacity-50"
              >
                {portalLoading ? <Spinner size={16} /> : <CreditCard size={16} />}
                {portalLoading
                  ? "Ouverture…"
                  : isPro
                    ? "Gérer / annuler mon abonnement"
                    : "Mettre à jour mon moyen de paiement"}
              </button>
            ) : (
              !awaitingActivation &&
              !activationEnRetard && (
                <Link
                  href="/tarifs"
                  className="press flex items-center justify-center gap-2 w-full rounded-control bg-teal text-white py-3 font-semibold shadow-soft"
                >
                  <Crown size={16} />
                  Passer en Pro
                </Link>
              )
            )}
          </>
        )}
      </div>
    </main>
  );
}
