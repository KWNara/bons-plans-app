"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  pseudo: string;
  email: string;
  role: "particulier" | "commercant" | "admin";
};

type MerchantProfile = {
  nom_enseigne: string;
  statut_verification: "verifie" | "en_attente_verification";
};

export default function ComptePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("pseudo, email, role")
        .eq("id", user.id)
        .single();

      setProfile(userRow);

      if (userRow?.role === "commercant") {
        const { data: merchantRow } = await supabase
          .from("merchant_profiles")
          .select("nom_enseigne, statut_verification")
          .eq("user_id", user.id)
          .single();

        setMerchant(merchantRow);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6">Mon compte</h1>

        <div className="rounded border border-ink/10 bg-white/50 p-4 mb-4">
          <p className="text-sm text-ink/60">Pseudo</p>
          <p className="font-medium mb-3">{profile?.pseudo}</p>

          <p className="text-sm text-ink/60">Email</p>
          <p className="font-medium mb-3">{profile?.email}</p>

          <p className="text-sm text-ink/60">Statut</p>
          <p className="font-medium">
            {profile?.role === "commercant" ? "Commerçant" : "Particulier"}
          </p>

          {profile?.role === "commercant" && merchant && (
            <>
              <p className="text-sm text-ink/60 mt-3">Enseigne</p>
              <p className="font-medium mb-3">{merchant.nom_enseigne}</p>

              <p className="text-sm text-ink/60">Vérification</p>
              <p className="font-medium">
                {merchant.statut_verification === "verifie" ? (
                  <span className="text-teal">✓ Vérifié</span>
                ) : (
                  <span className="text-marigold">⏳ En attente de vérification manuelle</span>
                )}
              </p>
            </>
          )}
        </div>

        {profile?.role === "particulier" && (
          <Link
            href="/devenir-commercant"
            className="block text-center w-full rounded border border-teal text-teal py-2 font-medium mb-3"
          >
            Devenir commerçant
          </Link>
        )}

        <button
          onClick={handleSignOut}
          className="w-full rounded bg-ink/10 text-ink py-2 font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </main>
  );
}
