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
  avatar_url: string | null;
  bio: string | null;
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

type FollowedCity = {
  id: string;
  cities: { nom: string; code_postal: string } | null;
};

type DealSummary = {
  id: string;
  titre: string;
  photos: string[];
  merchant_profiles: { nom_enseigne: string } | null;
};

export default function ComptePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [diffusionCities, setDiffusionCities] = useState<DiffusionCity[]>([]);
  const [cityError, setCityError] = useState<string | null>(null);
  const [followedCities, setFollowedCities] = useState<FollowedCity[]>([]);
  const [reposts, setReposts] = useState<{ id: string; deals: DealSummary | null }[]>([]);
  const [favorites, setFavorites] = useState<{ id: string; deals: DealSummary | null }[]>([]);

  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      setUserId(user.id);

      const { data: userRow } = await supabase
        .from("users")
        .select("pseudo, email, role, avatar_url, bio")
        .eq("id", user.id)
        .single();

      setProfile(userRow);
      setBio(userRow?.bio ?? "");

      if (userRow?.role === "commercant") {
        const { data: merchantRow } = await supabase
          .from("merchant_profiles")
          .select("id, nom_enseigne, statut_verification")
          .eq("user_id", user.id)
          .single();

        setMerchant(merchantRow);
        if (merchantRow) loadDiffusionCities(merchantRow.id);
      }

      const { data: follows } = await supabase
        .from("follows")
        .select("id, cities:followed_city_id (nom, code_postal)")
        .eq("follower_id", user.id)
        .not("followed_city_id", "is", null);
      setFollowedCities((follows as unknown as FollowedCity[]) ?? []);

      const { data: repostRows } = await supabase
        .from("reposts")
        .select("id, deals:deal_id (id, titre, photos, merchant_profiles(nom_enseigne))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setReposts((repostRows as unknown as { id: string; deals: DealSummary | null }[]) ?? []);

      const { data: favoriteRows } = await supabase
        .from("favorites")
        .select("id, deals:deal_id (id, titre, photos, merchant_profiles(nom_enseigne))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setFavorites((favoriteRows as unknown as { id: string; deals: DealSummary | null }[]) ?? []);

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

  async function handleSaveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    setProfileMessage(null);

    let avatar_url = profile?.avatar_url ?? null;

    if (avatarFile) {
      const path = `${userId}/${Date.now()}-${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile);
      if (uploadError) {
        setProfileMessage(`Échec de l'upload : ${uploadError.message}`);
        setSavingProfile(false);
        return;
      }
      avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase
      .from("users")
      .update({ bio: bio.trim() || null, avatar_url })
      .eq("id", userId);

    setSavingProfile(false);

    if (error) {
      setProfileMessage(error.message);
      return;
    }

    setProfile((p) => (p ? { ...p, bio: bio.trim() || null, avatar_url } : p));
    setAvatarFile(null);
    setProfileMessage("Profil mis à jour.");
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
          <div className="flex items-center gap-3 mb-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-ink/10 flex items-center justify-center font-bold text-ink/50">
                {profile?.pseudo?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{profile?.pseudo}</p>
              <p className="text-sm text-ink/60">{profile?.email}</p>
            </div>
          </div>

          <label className="block mb-2">
            <span className="text-sm text-ink/60">Photo de profil</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
          </label>

          <label className="block mb-2">
            <span className="text-sm text-ink/60">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
          </label>

          {profileMessage && <p className="text-sm text-teal mb-2">{profileMessage}</p>}

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="w-full rounded border border-teal text-teal py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {savingProfile ? "..." : "Enregistrer le profil"}
          </button>

          <p className="text-sm text-ink/60 mt-4">Statut</p>
          <p className="font-medium">
            {profile?.role === "commercant"
              ? "Commerçant"
              : profile?.role === "admin"
                ? "Admin"
                : "Particulier"}
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

          {profile?.role === "admin" && (
            <Link
              href="/admin/signalements"
              className="block text-center w-full rounded bg-ink text-white py-2 font-medium mt-3"
            >
              Back-office admin
            </Link>
          )}
        </div>

        <div className="rounded border border-ink/10 bg-white/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-ink/60">Villes suivies</p>
            <Link href="/ville" className="text-xs text-teal underline">
              Gérer
            </Link>
          </div>
          {followedCities.length === 0 ? (
            <p className="text-sm text-ink/40">Aucune ville suivie.</p>
          ) : (
            <p className="text-sm">
              {followedCities.map((f) => f.cities?.nom).filter(Boolean).join(" · ")}
            </p>
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

            <div className="flex gap-2 mt-4">
              <Link
                href="/mes-bons-plans"
                className="flex-1 text-center rounded border border-teal text-teal py-2 font-medium"
              >
                Mes bons plans
              </Link>
              <Link
                href={`/commercant/${merchant.id}`}
                className="flex-1 text-center rounded border border-ink/20 text-ink py-2 font-medium"
              >
                Voir ma vitrine
              </Link>
            </div>

            <Link
              href="/mon-abonnement"
              className="block text-center w-full rounded border border-marigold text-ink py-2 font-medium mt-2"
            >
              Mon abonnement
            </Link>
          </div>
        )}

        {reposts.length > 0 && (
          <div className="rounded border border-ink/10 bg-white/50 p-4 mb-4">
            <p className="text-sm text-ink/60 mb-2">Mes bons plans repartagés</p>
            <ul className="space-y-2">
              {reposts.map(
                (r) =>
                  r.deals && (
                    <li key={r.id}>
                      <Link
                        href={`/bons-plans/${r.deals.id}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        {r.deals.photos[0] && (
                          <img
                            src={r.deals.photos[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <span>
                          {r.deals.titre}
                          <span className="text-ink/50"> — {r.deals.merchant_profiles?.nom_enseigne}</span>
                        </span>
                      </Link>
                    </li>
                  )
              )}
            </ul>
          </div>
        )}

        {favorites.length > 0 && (
          <div className="rounded border border-ink/10 bg-white/50 p-4 mb-4">
            <p className="text-sm text-ink/60 mb-2">Mes favoris (privé)</p>
            <ul className="space-y-2">
              {favorites.map(
                (f) =>
                  f.deals && (
                    <li key={f.id}>
                      <Link
                        href={`/bons-plans/${f.deals.id}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        {f.deals.photos[0] && (
                          <img
                            src={f.deals.photos[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <span>
                          {f.deals.titre}
                          <span className="text-ink/50"> — {f.deals.merchant_profiles?.nom_enseigne}</span>
                        </span>
                      </Link>
                    </li>
                  )
              )}
            </ul>
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
