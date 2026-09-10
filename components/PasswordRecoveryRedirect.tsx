"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const RESET_PATH = "/reinitialiser-mot-de-passe";

// Le lien de réinitialisation n'atterrit sur la bonne page que si son URL
// figure dans les « Redirect URLs » autorisées côté Supabase. Sinon, Supabase
// renvoie vers la Site URL du projet : l'utilisateur arrive alors sur
// l'accueil, silencieusement connecté, sans jamais pouvoir changer son mot de
// passe. On rattrape ce cas ici, quelle que soit la page d'arrivée.
export function PasswordRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && pathname !== RESET_PATH) {
        router.replace(RESET_PATH);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
