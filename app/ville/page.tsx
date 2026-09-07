"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, LocateFixed, MapPin, Check, X } from "lucide-react";
import { CitySearchInput } from "@/components/CitySearchInput";
import { useCity } from "@/lib/cityContext";
import { resolveCity, reverseGeocodeCity, type BanSuggestion } from "@/lib/cities";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";

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
  const [followBusy, setFollowBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    } catch {
      setGeoError("Cette ville n'a pas pu être enregistrée. Réessaie dans un instant.");
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
    if (!userId || !selectedCity || followBusy) return;

    setFollowBusy(true);
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: userId, followed_city_id: selectedCity.id });

    if (error) {
      setGeoError("Cette ville n'a pas pu être ajoutée à tes villes suivies.");
    } else {
      await loadFollowed(userId);
    }

    setFollowBusy(false);
  }

  async function handleUnfollow(followId: string) {
    if (removingId) return;

    setRemovingId(followId);
    const { error } = await supabase.from("follows").delete().eq("id", followId);

    if (error) {
      setGeoError("Cette ville n'a pas pu être retirée.");
    } else if (userId) {
      await loadFollowed(userId);
    }

    setRemovingId(null);
  }

  const alreadyFollowed =
    selectedCity && followed.some((f) => f.followed_city_id === selectedCity.id);

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-sm mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour au fil"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-5">Choisir une ville</h1>

        <div className="bg-white rounded-card shadow-soft border border-ink/10 p-4 mb-4">
          <CitySearchInput onSelect={applySuggestion} label="Rechercher" />

          <button
            type="button"
            onClick={handleGeoloc}
            disabled={geoLoading}
            className="press mt-3 w-full flex items-center justify-center gap-2 rounded-control border border-teal text-teal py-3 text-sm font-semibold disabled:opacity-50"
          >
            {geoLoading ? <Spinner size={16} /> : <LocateFixed size={16} />}
            {geoLoading ? "Localisation…" : "Utiliser ma position"}
          </button>
        </div>

        {geoError && <p className="text-tag text-sm mb-4">{geoError}</p>}

        {selectedCity && (
          <div className="rounded-card border border-teal/30 bg-teal/5 p-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1">
              Ville active
            </p>
            <p className="flex items-center gap-1.5 font-bold text-lg text-ink">
              <MapPin size={17} className="text-tag shrink-0" />
              {selectedCity.nom} ({selectedCity.code_postal})
            </p>

            {userId && !alreadyFollowed && (
              <button
                type="button"
                onClick={handleFollow}
                disabled={followBusy}
                className="press mt-3 inline-flex items-center gap-1.5 rounded-control bg-teal text-white px-4 py-2.5 text-sm font-semibold shadow-soft disabled:opacity-50"
              >
                {followBusy && <Spinner size={14} />}
                Suivre cette ville
              </button>
            )}
            {userId && alreadyFollowed && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-teal">
                <Check size={15} />
                Déjà suivie
              </p>
            )}
          </div>
        )}

        {userId && followed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">
              Mes villes suivies
            </h2>
            <ul className="space-y-2">
              {followed.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 bg-white rounded-card shadow-soft border border-ink/10 pl-3.5 pr-2 py-1"
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
                    className="press flex-1 min-w-0 text-left text-sm font-medium text-ink py-2.5 truncate"
                  >
                    {f.cities?.nom} <span className="text-ink/60">({f.cities?.code_postal})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnfollow(f.id)}
                    disabled={removingId === f.id}
                    aria-label={`Ne plus suivre ${f.cities?.nom ?? "cette ville"}`}
                    className="press w-11 h-11 flex items-center justify-center rounded-full text-ink/60 hover:text-tag hover:bg-tag/10 disabled:opacity-50 shrink-0"
                  >
                    {removingId === f.id ? <Spinner size={14} /> : <X size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
