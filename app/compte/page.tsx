"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, ShieldCheck, Clock, Store, Repeat2, Bookmark, LogOut, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CitySearchInput } from "@/components/CitySearchInput";
import { resolveCity, type BanSuggestion } from "@/lib/cities";
import { Skeleton } from "@/components/ui/Skeleton";

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-ink/8 bg-white shadow-soft p-4 mb-4 ${className}`}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-ink/45 uppercase tracking-wide mb-2">{children}</p>;
}

function DealRow({ deal }: { deal: DealSummary }) {
  return (
    <Link
      href={`/bons-plans/${deal.id}`}
      className="press flex items-center gap-3 -mx-1.5 px-1.5 py-1.5 rounded-control hover:bg-paper"
    >
      {deal.photos[0] ? (
        <img src={deal.photos[0]} alt="" className="w-11 h-11 rounded-control object-cover shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-control bg-ink/5 shrink-0" />
      )}
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink truncate">{deal.titre}</span>
        <span className="block text-xs text-ink/45 truncate">{deal.merchant_profiles?.nom_enseigne}</span>
      </span>
    </Link>
  );
}

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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
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

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
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
    setAvatarPreview(null);
    setEditingProfile(false);
    setProfileMessage("Profil mis à jour.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper px-4 pt-6 pb-16">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-card mb-4" />
          <Skeleton className="h-16 w-full rounded-card mb-4" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour au fil"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <Card>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarPreview || profile?.avatar_url ? (
                <img
                  src={avatarPreview ?? profile!.avatar_url!}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-teal/15 flex items-center justify-center font-bold text-teal text-lg">
                  {profile?.pseudo?.[0]?.toUpperCase()}
                </div>
              )}
              {editingProfile && (
                <label className="press absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center cursor-pointer shadow-soft">
                  <Camera size={12} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink truncate">{profile?.pseudo}</p>
              <p className="text-sm text-ink/50 truncate">{profile?.email}</p>
              <span
                className={`inline-flex items-center gap-1 mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  profile?.role === "commercant"
                    ? "bg-teal/10 text-teal"
                    : profile?.role === "admin"
                      ? "bg-ink text-white"
                      : "bg-ink/10 text-ink/60"
                }`}
              >
                {profile?.role === "commercant" ? (
                  <>
                    <Store size={11} /> Commerçant
                  </>
                ) : profile?.role === "admin" ? (
                  "Admin"
                ) : (
                  "Particulier"
                )}
              </span>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="press text-xs font-semibold text-teal shrink-0"
              >
                Modifier
              </button>
            )}
          </div>

          {editingProfile && (
            <div className="mt-4 pt-4 border-t border-ink/8 animate-fade-in">
              <label className="block mb-3">
                <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Quelques mots sur toi..."
                  className="mt-1.5 w-full rounded-control border border-ink/15 px-3 py-2 text-sm focus:border-teal"
                />
              </label>

              {profileMessage && <p className="text-sm text-teal mb-2">{profileMessage}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProfile(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="press flex-1 rounded-control border border-ink/15 text-ink py-2 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="press flex-1 rounded-control bg-teal text-white py-2 text-sm font-medium disabled:opacity-50"
                >
                  {savingProfile ? "..." : "Enregistrer"}
                </button>
              </div>
            </div>
          )}

          {profile?.role === "commercant" && merchant && (
            <div className="mt-4 pt-4 border-t border-ink/8">
              <p className="text-xs font-semibold text-ink/45 uppercase tracking-wide mb-1">Enseigne</p>
              <p className="font-semibold text-ink mb-2">{merchant.nom_enseigne}</p>
              {merchant.statut_verification === "verifie" ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
                  <ShieldCheck size={15} /> Vérifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-marigold">
                  <Clock size={15} /> En attente de vérification manuelle
                </span>
              )}
            </div>
          )}

          {profile?.role === "admin" && (
            <Link
              href="/admin/signalements"
              className="press block text-center w-full rounded-control bg-ink text-white py-2.5 font-medium mt-4"
            >
              Back-office admin
            </Link>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2.5">
            <CardLabel>Villes suivies</CardLabel>
            <Link href="/ville" className="press text-xs font-semibold text-teal">
              Gérer
            </Link>
          </div>
          {followedCities.length === 0 ? (
            <p className="text-sm text-ink/40">Aucune ville suivie pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {followedCities.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 text-sm bg-paper rounded-full px-3 py-1"
                >
                  <MapPin size={12} className="text-tag" />
                  {f.cities?.nom}
                </span>
              ))}
            </div>
          )}
        </Card>

        {profile?.role === "commercant" && merchant && (
          <Card>
            <CardLabel>Villes de diffusion</CardLabel>

            <CitySearchInput
              onSelect={handleAddDiffusionCity}
              placeholder="Ajouter une ville de diffusion"
            />
            {cityError && <p className="text-tag text-sm mt-2">{cityError}</p>}

            {diffusionCities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {diffusionCities.map((dc) => (
                  <span
                    key={dc.id}
                    className="inline-flex items-center gap-1.5 text-sm bg-paper rounded-full pl-3 pr-1.5 py-1"
                  >
                    {dc.cities?.nom}
                    <button
                      type="button"
                      onClick={() => handleRemoveDiffusionCity(dc.id)}
                      aria-label="Retirer"
                      className="press w-5 h-5 rounded-full hover:bg-tag/10 text-ink/40 hover:text-tag flex items-center justify-center text-base leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Link
                href="/mes-bons-plans"
                className="press flex-1 text-center rounded-control border border-teal text-teal py-2.5 text-sm font-semibold"
              >
                Mes bons plans
              </Link>
              <Link
                href={`/commercant/${merchant.id}`}
                className="press flex-1 text-center rounded-control border border-ink/15 text-ink py-2.5 text-sm font-semibold"
              >
                Ma vitrine
              </Link>
            </div>

            <Link
              href="/mon-abonnement"
              className="press block text-center w-full rounded-control bg-marigold/15 text-ink py-2.5 text-sm font-semibold mt-2"
            >
              Mon abonnement
            </Link>
          </Card>
        )}

        {reposts.length > 0 && (
          <Card>
            <CardLabel>
              <span className="inline-flex items-center gap-1.5">
                <Repeat2 size={13} /> Repartagés
              </span>
            </CardLabel>
            <div className="space-y-0.5">
              {reposts.map((r) => r.deals && <DealRow key={r.id} deal={r.deals} />)}
            </div>
          </Card>
        )}

        {favorites.length > 0 && (
          <Card>
            <CardLabel>
              <span className="inline-flex items-center gap-1.5">
                <Bookmark size={13} /> Favoris · privé
              </span>
            </CardLabel>
            <div className="space-y-0.5">
              {favorites.map((f) => f.deals && <DealRow key={f.id} deal={f.deals} />)}
            </div>
          </Card>
        )}

        {profile?.role === "particulier" && (
          <Link
            href="/devenir-commercant"
            className="press block text-center w-full rounded-control border border-teal text-teal py-2.5 font-semibold mb-3"
          >
            Devenir commerçant
          </Link>
        )}

        <button
          onClick={handleSignOut}
          className="press flex items-center justify-center gap-2 w-full rounded-control bg-ink/8 text-ink/70 py-2.5 font-medium"
        >
          <LogOut size={15} />
          Se déconnecter
        </button>
      </div>
    </main>
  );
}
