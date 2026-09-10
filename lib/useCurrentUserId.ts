"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// undefined = en cours de chargement, null = non connecté
export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!active) return;
      // Une erreur réseau ne signifie pas « non connecté » : sans cette
      // distinction, un incident passager déconnectait visuellement
      // l'utilisateur et le renvoyait vers la page de connexion.
      if (error) return;
      setUserId(user?.id ?? null);
    });

    // Sans cette écoute, une connexion ou une déconnexion faite dans un autre
    // onglet (ou l'expiration du jeton) n'était jamais reflétée ici : les
    // composants déjà montés continuaient d'afficher l'ancien état.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
