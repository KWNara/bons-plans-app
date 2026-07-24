"use client";

import { useEffect, useState } from "react";
import { CitySearchInput } from "@/components/CitySearchInput";
import { useCity } from "@/lib/cityContext";
import { resolveCity, reverseGeocodeCity, type BanSuggestion } from "@/lib/cities";
import { supabase } from "@/lib/supabase";

type FollowedCity = {
  id: string;
  followed_city_id: string;
  cities: { nom: string; code_postal: string } | null;
};

export default function VillePage() {
  const { selectedCity, setSelectedCity } = useCity();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<FollowedCity[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (user) loadFollowed(user.id);
    });
  }, []);

  async function loadFollowed(uid: string) {
    const { data } = await supabase
      .from("follows")
      .select("id, followed_city_id, cities:followed_city_id (nom, code_postal)")
      .eq("follower_id", uid)
      .not("followed_city_id", "is", null);
    setFollowed((data as unknown as FollowedCity[]) ?? []);
  }

  async function applySuggestion(suggestion: BanSuggestion) {
    setGeoError(null);
    try {
      const city = await resolveCity(suggestion);
      setSelectedCity(city);
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  function handleGeoloc() {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const suggestion = await reverseGeocodeCity(
            position.coords.longitude,
            position.coords.latitude
          );
          if (!suggestion) {
            setGeoError("Aucune ville trouvée près de ta position.");
            return;
          }
          await applySuggestion(suggestion);
        } catch {
          setGeoError("Impossible de déterminer ta ville depuis ta position.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoError(
          "Géolocalisation refusée ou indisponible — utilise plutôt la recherche manuelle."
        );
        setGeoLoading(false);
      }
    );
  }

  async function handleFollow() {
    if (!userId || !selectedCity) return;
    await supabase
      .from("follows")
      .insert({ follower_id: userId, followed_city_id: selectedCity.id });
    loadFollowed(userId);
  }

  async function handleUnfollow(followId: string) {
    await supabase.from("follows").delete().eq("id", followId);
    if (userId) loadFollowed(userId);
  }

  const alreadyFollowed =
    selectedCity && followed.some((f) => f.followed_city_id === selectedCity.id);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6">Choisir une ville</h1>

        <CitySearchInput onSelect={applySuggestion} />

        <button
          type="button"
          onClick={handleGeoloc}
          disabled={geoLoading}
          className="mt-3 w-full rounded border border-teal text-teal py-2 font-medium disabled:opacity-50"
        >
          📍 {geoLoading ? "Localisation..." : "Utiliser ma position"}
        </button>

        {geoError && <p className="text-tag text-sm mt-3">{geoError}</p>}

        {selectedCity && (
          <div className="mt-6 rounded border border-teal/30 bg-teal/5 p-4">
            <p className="text-sm text-ink/60">Ville active</p>
            <p className="font-medium text-lg">
              {selectedCity.nom} ({selectedCity.code_postal})
            </p>

            {userId && !alreadyFollowed && (
              <button
                type="button"
                onClick={handleFollow}
                className="mt-2 text-sm text-teal underline"
              >
                + Suivre cette ville
              </button>
            )}
            {userId && alreadyFollowed && (
              <p className="mt-2 text-sm text-ink/50">✓ Déjà suivie</p>
            )}
          </div>
        )}

        {userId && followed.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-ink/60 mb-2">Mes villes suivies</p>
            <ul className="space-y-2">
              {followed.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded border border-ink/10 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      f.cities &&
                      setSelectedCity({
                        id: f.followed_city_id,
                        nom: f.cities.nom,
                        code_postal: f.cities.code_postal,
                      })
                    }
                    className="text-left"
                  >
                    {f.cities?.nom} ({f.cities?.code_postal})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnfollow(f.id)}
                    className="text-tag text-sm"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
