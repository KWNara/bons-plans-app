"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { clesAbonnement, cleVersTableau } from "@/lib/push";
import { Spinner } from "@/components/ui/Spinner";

type Props = { userId: string };

type Etat =
  | "verification"
  | "non-supporte"
  | "sans-cle"
  | "refuse"
  | "inactif"
  | "actif";

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function ActiverNotifications({ userId }: Props) {
  const [etat, setEtat] = useState<Etat>("verification");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const verifier = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Le push demande trois briques distinctes : un service worker, l'API de
    // notification et le gestionnaire de push. iOS ne les a réunies qu'à partir
    // de la version 16.4, et seulement pour une application installée.
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setEtat("non-supporte");
      return;
    }

    if (!CLE_PUBLIQUE) {
      setEtat("sans-cle");
      return;
    }

    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }

    const enregistrement = await navigator.serviceWorker.ready;
    const abonnement = await enregistrement.pushManager.getSubscription();

    setEtat(abonnement ? "actif" : "inactif");
  }, []);

  useEffect(() => {
    verifier();
  }, [verifier]);

  async function activer() {
    setErreur(null);
    setOccupe(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }

      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleVersTableau(CLE_PUBLIQUE),
      });

      const { p256dh, auth } = clesAbonnement(abonnement);

      // `endpoint` est unique : un réabonnement du même appareil remplace la
      // ligne au lieu d'en créer une seconde, qui recevrait un doublon.
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: abonnement.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 200),
        },
        { onConflict: "endpoint" }
      );

      if (error) {
        // L'abonnement navigateur est annulé si la base l'a refusé : sans ça,
        // l'appareil serait abonné côté service de push sans qu'on sache lui
        // envoyer quoi que ce soit.
        await abonnement.unsubscribe();
        throw error;
      }

      setEtat("actif");
    } catch (e) {
      console.error(e);
      setErreur("Les notifications n'ont pas pu être activées.");
    } finally {
      setOccupe(false);
    }
  }

  async function desactiver() {
    setErreur(null);
    setOccupe(true);

    try {
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.getSubscription();

      if (abonnement) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", abonnement.endpoint);
        await abonnement.unsubscribe();
      }

      setEtat("inactif");
    } catch (e) {
      console.error(e);
      setErreur("La désactivation a échoué.");
    } finally {
      setOccupe(false);
    }
  }

  if (etat === "verification") return null;

  // Rien ne sert de proposer un réglage que l'appareil ne sait pas honorer, ni
  // d'exposer une erreur de configuration du serveur à l'utilisateur.
  if (etat === "non-supporte" || etat === "sans-cle") return null;

  return (
    <div className="rounded-card border border-ink/10 bg-surface p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
          {etat === "actif" ? (
            <BellRing size={17} className="text-teal" />
          ) : (
            <BellOff size={17} className="text-teal" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Notifications sur cet appareil</p>
          <p className="text-sm text-ink/70">
            {etat === "actif"
              ? "Tu seras prévenu même quand Déniche est fermé."
              : etat === "refuse"
                ? "Tu les as refusées : réactive-les dans les réglages de ton navigateur."
                : "Sois prévenu d'un message ou d'une offre flash."}
          </p>
        </div>
      </div>

      {erreur && <p className="text-tag text-sm mt-3">{erreur}</p>}

      {etat !== "refuse" && (
        <button
          onClick={etat === "actif" ? desactiver : activer}
          disabled={occupe}
          className={`press w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-control py-2.5 text-sm font-semibold disabled:opacity-60 ${
            etat === "actif"
              ? "border border-ink/15 text-ink"
              : "bg-teal text-white shadow-soft"
          }`}
        >
          {occupe ? <Spinner size={15} /> : etat === "actif" ? <Check size={15} /> : null}
          {etat === "actif" ? "Activées · désactiver" : "Activer les notifications"}
        </button>
      )}
    </div>
  );
}
