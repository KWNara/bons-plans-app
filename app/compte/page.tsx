"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CitySearchInput } from "@/components/CitySearchInput";
import { resolveCity, type BanSuggestion } from "@/lib/cities";

type Profile = {
  pseudo: string;
  email: string;
  role: "particulier" | "commercant" | "admin";
};

type MerchantProfile = {
  id: string;
  nom_enseigne: string;
  statut_verification: "verifie" | "en_attente_verification";
};

type DiffusionCity = {
  id: string;
  city_id: string;
  cities: { nom: string; code_postal: string } | null;
};

export default function ComptePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [diffusionCities, setDiffusionCities] = useState<DiffusionCity[]>([]);
  const [cityError, setCityError] = useState<string | null>(null);

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
          .select("id, nom_enseigne, statut_verification")
          .eq("user_id", user.id)
          .single();

        setMerchant(merchantRow);
        if (merchantRow) loadDiffusionCities(merchantRow.id);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function loadDiffusionCities(merchantId: string) {
    const { data } = await supabase
      .from("merchant_cities")
      .select("id, city_id, cities:city_id (nom, code_postal)")
      .eq("merchant_id", merchantId);
    setDiffusionCities((data as unknown as DiffusionCity[]) ?? []);
  }

  async function handleAddDiffusionCity(suggestion: BanSuggestion) {
    if (!merchant) return;
    setCityError(null);
    try {
      const city = await resolveCity(suggestion);
      const { error } = await supabase
        .from("merchant_cities")
        .insert({ merchant_id: merchant.id, city_id: city.id });
      if (error && error.code !== "23505") throw error;
      loadDiffusionCities(merchant.id);
    } catch (e) {
      setCityError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  async function handleRemoveDiffusionCity(id: string) {
    await supabase.from("merchant_cities").delete().eq("id", id);
    if (merchant) loadDiffusionCities(merchant.id);
  }

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

        {profile?.role === "commercant" && merchant && (
          <div className="rounded border border-ink/10 bg-white/50 p-4 mb-4">
            <p className="text-sm text-ink/60 mb-2">Villes de diffusion</p>

            <CitySearchInput
              onSelect={handleAddDiffusionCity}
              placeholder="Ajouter une ville de diffusion"
            />
            {cityError && <p className="text-tag text-sm mt-2">{cityError}</p>}

            {diffusionCities.length > 0 && (
              <ul className="mt-3 space-y-2">
                {diffusionCities.map((dc) => (
                  <li
                    key={dc.id}
                    className="flex items-center justify-between rounded border border-ink/10 px-3 py-2"
                  >
                    <span>
                      {dc.cities?.nom} ({dc.cities?.code_postal})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDiffusionCity(dc.id)}
                      className="text-tag text-sm"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {profile?.role === "particulier" && (
          <Link
            href="/devenir-commercant"
            className="block text-center w-full rounded border border-teal text-teal py-2 font-medium mb-3"
          >
            Devenir commerçant
          </Link>
        )}

        <Link
          href="/ville"
          className="block text-center w-full rounded border border-ink/20 text-ink py-2 font-medium mb-3"
        >
          Changer de ville
        </Link>

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
