"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// undefined = en cours de chargement, null = non connecté
export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    // `getSession` lit la session déjà stockée localement, là où `getUser`
    // interroge le serveur — ce qui, pour un visiteur non connecté, coûtait un
    // aller-retour réseau et un 403 sur chaque page publique. La vérification
    // du jeton n'apporte rien ici : ce que l'utilisateur a le droit de voir est
    // décidé par les politiques RLS, côté base, pas par cet identifiant.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return;
      // Une erreur ne signifie pas « non connecté » : sans cette distinction,
      // un incident passager déconnectait visuellement l'utilisateur et le
      // renvoyait vers la page de connexion.
      if (error) return;
      setUserId(session?.user?.id ?? null);
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
