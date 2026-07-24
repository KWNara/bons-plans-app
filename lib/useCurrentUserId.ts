"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// undefined = en cours de chargement, null = non connecté
export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  return userId;
}
