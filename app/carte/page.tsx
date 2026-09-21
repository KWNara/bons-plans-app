"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, MapPinOff, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCity } from "@/lib/cityContext";
import { estFlash } from "@/lib/dealFormat";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RechercheVide } from "@/components/ui/Illustrations";
import type { RepereDeal } from "@/components/CarteDeals";

// Leaflet touche à `window` dès l'import : rendu côté serveur, il fait planter
// la page. Le chargement dynamique sans SSR est la seule façon de l'embarquer
// dans l'App Router.
const CarteDeals = dynamic(() => import("@/components/CarteDeals"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-card" />,
});

type LigneDeal = {
  id: string;
  titre: string;
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  date_fin: string | null;
  merchant_profiles: {
    nom_enseigne: string;
    adresse: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export default function CartePage() {
  const { selectedCity, loaded } = useCity();
  const [etat, setEtat] = useState<"chargement" | "erreur" | "pret">("chargement");
  const [reperes, setReperes] = useState<RepereDeal[]>([]);
  const [sansAdresse, setSansAdresse] = useState(0);
  const [centre, setCentre] = useState<{ latitude: number; longitude: number } | null>(null);

  const charger = useCallback(async () => {
    if (!selectedCity) return;

    setEtat("chargement");

    const [{ data: ville, error: erreurVille }, { data: lignes, error: erreurDeals }] =
      await Promise.all([
        supabase
          .from("cities")
          .select("latitude, longitude")
          .eq("id", selectedCity.id)
          .maybeSingle(),
        supabase
          .from("deals")
          .select(
            "id, titre, prix_avant, prix_apres, reduction_pourcentage, date_fin, merchant_profiles(nom_enseigne, adresse, latitude, longitude), deal_cities!inner(city_id)"
          )
          .eq("statut", "publie")
          .eq("deal_cities.city_id", selectedCity.id)
          .or(`date_fin.is.null,date_fin.gt.${new Date().toISOString()}`),
      ]);

    if (erreurVille || erreurDeals) {
      setEtat("erreur");
      return;
    }

    const tous = (lignes as unknown as LigneDeal[]) ?? [];

    const places: RepereDeal[] = [];
    let orphelins = 0;

    for (const d of tous) {
      const m = d.merchant_profiles;
      if (!m || m.latitude === null || m.longitude === null || !m.adresse) {
        orphelins += 1;
        continue;
      }
      places.push({
        id: d.id,
        titre: d.titre,
        prix_avant: d.prix_avant,
        prix_apres: d.prix_apres,
        reduction_pourcentage: d.reduction_pourcentage,
        date_fin: d.date_fin,
        enseigne: m.nom_enseigne,
        adresse: m.adresse,
        latitude: m.latitude,
        longitude: m.longitude,
      });
    }

    setReperes(places);
    setSansAdresse(orphelins);

    // Sans position connue pour la ville, on se cale sur le premier repère
    // plutôt que d'ouvrir la carte au milieu de l'Atlantique.
    setCentre(
      ville?.latitude != null && ville?.longitude != null
        ? { latitude: ville.latitude, longitude: ville.longitude }
        : places[0]
          ? { latitude: places[0].latitude, longitude: places[0].longitude }
          : null
    );

    setEtat("pret");
  }, [selectedCity]);

  useEffect(() => {
    if (loaded) charger();
  }, [loaded, charger]);

  const flash = reperes.filter((r) => estFlash(r.date_fin)).length;

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-surface"
          aria-label="Retour au fil"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-1">Autour de moi</h1>
        <p className="text-sm text-ink/70 mb-5">
          {selectedCity
            ? `Les bons plans de ${selectedCity.nom} situés par leur commerçant.`
            : "Choisis d'abord une ville."}
        </p>

        {!loaded || (selectedCity && etat === "chargement") ? (
          <Skeleton className="h-80 w-full rounded-card" />
        ) : !selectedCity ? (
          <EmptyState
            icon={MapPinOff}
            title="Aucune ville choisie"
            description="La carte a besoin d'une ville pour savoir où se placer."
            action={
              <Link
                href="/ville"
                className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
              >
                Choisir ma ville
              </Link>
            }
          />
        ) : etat === "erreur" ? (
          <ErrorState
            title="Carte indisponible"
            description="Les bons plans localisés n'ont pas pu être récupérés."
            onRetry={charger}
          />
        ) : centre === null ? (
          <EmptyState
            illustration={RechercheVide}
            title="Rien à placer sur la carte"
            description="Aucun commerçant de cette ville n'a encore renseigné son adresse."
          />
        ) : (
          <>
            {/* `carte-deniche` porte l'habillage Leaflet aux couleurs du thème
                (cf. app/globals.css) : sans cette classe, la feuille de Leaflet
                l'emporte et l'infobulle reste blanche à liens bleus. */}
            <div className="carte-deniche h-80 sm:h-[26rem] rounded-card overflow-hidden border border-ink/10 shadow-soft">
              <CarteDeals reperes={reperes} centre={centre} />
            </div>

            <p className="text-xs text-ink/60 mt-2">
              {reperes.length === 0
                ? "Aucun bon plan localisé pour l'instant."
                : `${reperes.length} bon${reperes.length > 1 ? "s" : ""} plan${
                    reperes.length > 1 ? "s" : ""
                  } placé${reperes.length > 1 ? "s" : ""}${flash > 0 ? ` · ${flash} en flash` : ""}.`}
            </p>

            {/* Annoncer ce qui manque évite de faire passer une carte
                incomplète pour la réalité du terrain. */}
            {sansAdresse > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-control border border-ink/10 bg-surface px-3.5 py-2.5 text-sm text-ink/70">
                <Store size={15} className="text-ink/50 shrink-0 mt-0.5" />
                <span>
                  {sansAdresse} bon{sansAdresse > 1 ? "s" : ""} plan
                  {sansAdresse > 1 ? "s" : ""} de cette ville {sansAdresse > 1 ? "ne sont" : "n'est"}{" "}
                  pas sur la carte : leur commerçant n&apos;a pas renseigné d&apos;adresse.
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
