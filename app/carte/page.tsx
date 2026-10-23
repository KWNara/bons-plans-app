"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, MapPin, Search, Star, Store, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCity } from "@/lib/cityContext";
import { discountLabel } from "@/lib/dealFormat";
import { searchCities, type BanSuggestion } from "@/lib/cities";
import {
  dansZone,
  etiquette,
  meilleureReduction,
  noteMoyenne,
  sansAccents,
  type Zone,
} from "@/lib/carte";
import { FiltresCategories, type Categorie } from "@/components/FiltresCategories";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RechercheVide } from "@/components/ui/Illustrations";
import type { Cible, Vue } from "@/components/CarteCommerces";

// Leaflet touche à `window` dès l'import : rendu côté serveur, il fait planter
// la page. Le chargement dynamique sans SSR est la seule façon de l'embarquer
// dans l'App Router.
const CarteCommerces = dynamic(() => import("@/components/CarteCommerces"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

type Offre = {
  id: string;
  titre: string;
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  category_id: string | null;
};

type LigneCommerce = {
  id: string;
  nom_enseigne: string;
  logo_url: string | null;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  category_id: string | null;
  deals: Offre[];
  merchant_reviews: { note: number }[];
};

type Commerce = Omit<LigneCommerce, "latitude" | "longitude" | "merchant_reviews"> & {
  latitude: number;
  longitude: number;
  note: { moyenne: number; total: number } | null;
};

const FRANCE: Vue = { centre: [46.6, 2.4], zoom: 6 };

function nombreOffres(n: number) {
  return n === 0 ? "Pas d'offre en ce moment" : `${n} offre${n > 1 ? "s" : ""} en cours`;
}

// Un commerce relève d'une catégorie par la sienne propre, ou par celle d'une
// de ses offres : une épicerie qui propose un atelier cuisine doit aussi
// remonter sous « Loisirs ».
function relevDe(c: Commerce, categorieId: string | null) {
  return categorieId === null || c.category_id === categorieId || c.deals.some((d) => d.category_id === categorieId);
}

export default function CartePage() {
  const { selectedCity, loaded } = useCity();
  const [etat, setEtat] = useState<"chargement" | "erreur" | "pret">("chargement");
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [sansAdresse, setSansAdresse] = useState(0);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [categoriesEnEchec, setCategoriesEnEchec] = useState(false);
  const [categorieId, setCategorieId] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>(FRANCE);
  const [cible, setCible] = useState<Cible | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [survole, setSurvole] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, nom, icone")
      .order("nom")
      .then(({ data, error }) => {
        setCategoriesEnEchec(Boolean(error));
        if (!error) setCategories(data ?? []);
      });
  }, []);

  const charger = useCallback(async () => {
    setEtat("chargement");
    const maintenant = new Date().toISOString();

    // ponytail: tous les partenaires chargés d'un coup puis filtrés par zone
    // côté client — passer à une requête bornée (latitude/longitude entre…)
    // quand il y en aura des milliers.
    const [ville, resultat] = await Promise.all([
      selectedCity
        ? supabase.from("cities").select("latitude, longitude").eq("id", selectedCity.id).maybeSingle()
        : null,
      supabase
        .from("merchant_profiles")
        .select(
          "id, nom_enseigne, logo_url, adresse, latitude, longitude, category_id, deals(id, titre, prix_avant, prix_apres, reduction_pourcentage, category_id), merchant_reviews(note)"
        )
        .eq("statut_verification", "verifie")
        .eq("suspendu", false)
        // Filtres sur les offres embarquées, pas sur les commerces : un
        // partenaire sans offre en cours reste sur la carte. La policy RLS
        // filtre déjà pour un visiteur, mais un commerçant y verrait sinon
        // ses propres brouillons.
        .eq("deals.statut", "publie")
        .or(`date_fin.is.null,date_fin.gt.${maintenant}`, { referencedTable: "deals" })
        .or(`date_debut.is.null,date_debut.lte.${maintenant}`, { referencedTable: "deals" }),
    ]);

    if (resultat.error) {
      setEtat("erreur");
      return;
    }

    const lignes = (resultat.data ?? []) as unknown as LigneCommerce[];
    const places: Commerce[] = [];
    for (const { merchant_reviews, latitude, longitude, ...c } of lignes) {
      if (latitude === null || longitude === null) continue;
      places.push({ ...c, latitude, longitude, note: noteMoyenne(merchant_reviews) });
    }

    setCommerces(places);
    setSansAdresse(lignes.length - places.length);

    const v = ville?.data;
    setVue(
      v?.latitude != null && v.longitude != null
        ? { centre: [v.latitude, v.longitude], zoom: 13 }
        : places.length > 0
          ? { limites: places.map((c) => [c.latitude, c.longitude]) }
          : FRANCE
    );
    setEtat("pret");
  }, [selectedCity]);

  useEffect(() => {
    if (loaded) charger();
  }, [loaded, charger]);

  const filtres = useMemo(() => commerces.filter((c) => relevDe(c, categorieId)), [commerces, categorieId]);

  const pins = useMemo(
    () =>
      filtres.map((c) => ({
        id: c.id,
        nom: c.nom_enseigne,
        latitude: c.latitude,
        longitude: c.longitude,
        etiquette: etiquette(c.deals),
      })),
    [filtres]
  );

  // La liste suit ce que montre la carte, comme sur Airbnb : déplacer ou
  // zoomer la carte, c'est chercher.
  const visibles = useMemo(
    () =>
      (zone ? filtres.filter((c) => dansZone(c, zone)) : [...filtres]).sort(
        (a, b) => b.deals.length - a.deals.length
      ),
    [filtres, zone]
  );

  // Cherché dans `filtres` et non `commerces` : changer de catégorie ferme
  // la fiche d'un commerce qui n'en fait plus partie.
  const choisi = filtres.find((c) => c.id === selection) ?? null;

  function allerAuCommerce(c: Commerce) {
    // Le commerce cherché doit rester visible même s'il sort du filtre actif.
    if (!relevDe(c, categorieId)) setCategorieId(null);
    setSelection(c.id);
    setCible({ centre: [c.latitude, c.longitude], zoom: 16, fiche: true });
  }

  function allerALaVille(v: BanSuggestion) {
    if (v.latitude === null || v.longitude === null) return;
    setSelection(null);
    setCible({ centre: [v.latitude, v.longitude], zoom: 13 });
  }

  return (
    // Sur grand écran, la page tient exactement dans la fenêtre, comme Airbnb :
    // la liste défile dans sa colonne et la carte occupe toute la hauteur
    // restante. Sinon, le bas de la carte — et la fiche qui s'y ouvre —
    // tombait sous la ligne de flottaison.
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16 lg:h-dvh lg:min-h-0 lg:pb-4 lg:flex lg:flex-col">
      <div className="max-w-6xl mx-auto w-full lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-surface"
          aria-label="Retour au fil"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-1">Carte des partenaires</h1>
        <p className="text-sm text-ink/70 mb-4">
          Déplace la carte pour découvrir les commerces partenaires et ce qu&apos;ils proposent.
        </p>

        {!loaded || etat === "chargement" ? (
          <Skeleton className="h-[55dvh] w-full rounded-card" />
        ) : etat === "erreur" ? (
          <ErrorState
            title="Carte indisponible"
            description="Les commerces partenaires n'ont pas pu être récupérés."
            onRetry={charger}
          />
        ) : commerces.length === 0 ? (
          <EmptyState
            illustration={RechercheVide}
            title="Rien à placer sur la carte"
            description="Aucun commerce partenaire n'a encore renseigné son adresse."
          />
        ) : (
          <>
            <RechercheCarte commerces={commerces} onCommerce={allerAuCommerce} onVille={allerALaVille} />

            <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 py-3 no-scrollbar">
              <FiltresCategories
                categories={categories}
                categorieId={categorieId}
                onChange={setCategorieId}
                enEchec={categoriesEnEchec}
              />
            </div>

            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[minmax(0,1fr)] lg:flex-1 lg:min-h-0">
              {/* `carte-deniche` porte l'habillage Leaflet aux couleurs du thème
                  (cf. app/globals.css) ; `isolate` cantonne les z-index de
                  Leaflet à la carte, sous les suggestions de recherche. La
                  carte passe en premier sur téléphone, à droite sur grand
                  écran. */}
              <div className="carte-deniche isolate relative h-[55dvh] lg:order-2 lg:h-full rounded-card overflow-hidden border border-ink/10 shadow-soft">
                <CarteCommerces
                  pins={pins}
                  vue={vue}
                  cible={cible}
                  actifId={selection ?? survole}
                  onSelection={setSelection}
                  onZone={setZone}
                />
                {choisi && <FicheCommerce commerce={choisi} onFermer={() => setSelection(null)} />}
              </div>

              <section className="lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                <p className="text-sm font-semibold text-ink mb-3" aria-live="polite">
                  {visibles.length === 0
                    ? `Aucun partenaire${categorieId ? " de cette catégorie" : ""} dans cette zone — dézoome ou déplace la carte.`
                    : `${visibles.length} commerce${visibles.length > 1 ? "s" : ""} partenaire${
                        visibles.length > 1 ? "s" : ""
                      } dans cette zone`}
                </p>

                <ul className="space-y-2.5">
                  {visibles.map((c) => {
                    const badge = meilleureReduction(c.deals);
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/commercant/${c.id}`}
                          onMouseEnter={() => setSurvole(c.id)}
                          onMouseLeave={() => setSurvole(null)}
                          onFocus={() => setSurvole(c.id)}
                          onBlur={() => setSurvole(null)}
                          className="press flex items-center gap-3 rounded-card border border-ink/10 bg-surface p-3 shadow-soft hover:shadow-raised transition-shadow"
                        >
                          <Avatar pseudo={c.nom_enseigne} url={c.logo_url} size={48} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="font-bold text-ink truncate">{c.nom_enseigne}</span>
                              <Note note={c.note} />
                            </span>
                            {c.adresse && <span className="block text-xs text-ink/60 truncate">{c.adresse}</span>}
                            <span className="block text-xs text-ink/70 mt-0.5">{nombreOffres(c.deals.length)}</span>
                          </span>
                          {badge && <span className="text-tag font-bold text-sm shrink-0">{badge}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Annoncer ce qui manque évite de faire passer une carte
                    incomplète pour la réalité du terrain. Masqué sous un filtre :
                    on ne sait pas de quelle catégorie relèvent ces partenaires. */}
                {sansAdresse > 0 && categorieId === null && (
                  <p className="mt-3 flex items-start gap-2 rounded-control border border-ink/10 bg-surface px-3.5 py-2.5 text-sm text-ink/70">
                    <Store size={15} className="text-ink/50 shrink-0 mt-0.5" />
                    <span>
                      {sansAdresse} partenaire{sansAdresse > 1 ? "s" : ""} n&apos;
                      {sansAdresse > 1 ? "apparaissent" : "apparaît"} pas : adresse non renseignée.
                    </span>
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Note({ note }: { note: Commerce["note"] }) {
  if (!note) return null;
  const moyenne = note.moyenne.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink shrink-0"
      aria-label={`Noté ${moyenne} sur 5, ${note.total} avis`}
    >
      <Star size={12} className="fill-marigold text-marigold" aria-hidden="true" />
      {moyenne}
      <span className="text-ink/60 font-normal">({note.total})</span>
    </span>
  );
}

type Option = { type: "commerce"; commerce: Commerce } | { type: "ville"; ville: BanSuggestion };

function RechercheCarte({
  commerces,
  onCommerce,
  onVille,
}: {
  commerces: Commerce[];
  onCommerce: (c: Commerce) => void;
  onVille: (v: BanSuggestion) => void;
}) {
  const id = useId();
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const [villes, setVilles] = useState<BanSuggestion[]>([]);
  const [chargement, setChargement] = useState(false);
  const [echec, setEchec] = useState(false);

  const terme = sansAccents(texte.trim());
  const assezLong = terme.length >= 2;

  const commercesTrouves = useMemo(
    () => (assezLong ? commerces.filter((c) => sansAccents(c.nom_enseigne).includes(terme)).slice(0, 5) : []),
    [commerces, terme, assezLong]
  );

  // Même mécanique que CitySearchInput : attente de 300 ms puis annulation de
  // la requête précédente, pour ne pas laisser une réponse lente écraser la
  // plus récente.
  useEffect(() => {
    const q = texte.trim();
    // Vidées à chaque frappe : sinon, pendant la requête suivante, Entrée
    // pouvait encore choisir une ville trouvée pour l'ancien texte.
    setVilles([]);

    // L'API Adresse refuse toute requête de moins de 3 caractères (HTTP 400) :
    // l'envoyer affichait « indisponible » à chaque saisie de 2 lettres. Les
    // commerces, eux, se cherchent dès 2 lettres.
    if (q.length < 3) {
      setChargement(false);
      setEchec(false);
      return;
    }

    const controleur = new AbortController();
    setChargement(true);
    setEchec(false);

    const minuteur = setTimeout(async () => {
      try {
        const resultats = await searchCities(q, controleur.signal);
        setVilles(resultats.filter((v) => v.latitude !== null && v.longitude !== null));
        setChargement(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setEchec(true);
        setChargement(false);
      }
    }, 300);

    return () => {
      clearTimeout(minuteur);
      controleur.abort();
    };
  }, [texte]);

  const options: Option[] = [
    ...commercesTrouves.map((commerce) => ({ type: "commerce" as const, commerce })),
    ...villes.map((ville) => ({ type: "ville" as const, ville })),
  ];
  const listeVisible = ouvert && assezLong;
  // Sous 3 lettres, les villes ne sont pas encore cherchées : dire « aucune
  // ville ne correspond » serait faux.
  const messageVide = texte.trim().length < 3 ? MESSAGE_TROP_COURT : MESSAGE_VIDE;
  const statut = !listeVisible
    ? ""
    : chargement
      ? "Recherche des villes…"
      : echec
        ? MESSAGE_ECHEC
        : options.length === 0
          ? messageVide
          : `${options.length} suggestion${options.length > 1 ? "s" : ""}`;

  function choisir(o: Option) {
    if (o.type === "commerce") onCommerce(o.commerce);
    else onVille(o.ville);
    setTexte("");
    setOuvert(false);
    setActif(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOuvert(true);
      setActif((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && listeVisible && options.length > 0) {
      e.preventDefault();
      choisir(options[actif] ?? options[0]);
    } else if (e.key === "Escape") {
      setOuvert(false);
      setActif(-1);
    }
  }

  function ligne(o: Option, i: number) {
    return (
      <li
        key={o.type === "commerce" ? o.commerce.id : o.ville.code_insee}
        id={`${id}-option-${i}`}
        role="option"
        aria-selected={actif === i}
        // Sans ça, le champ perd le focus avant que le clic n'arrive et la
        // liste se ferme sous le doigt.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => choisir(o)}
        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink cursor-pointer hover:bg-ink/5 ${
          actif === i ? "bg-ink/5" : ""
        }`}
      >
        {o.type === "commerce" ? (
          <>
            <Store size={15} className="text-teal shrink-0" aria-hidden="true" />
            <span className="truncate">{o.commerce.nom_enseigne}</span>
          </>
        ) : (
          <>
            <MapPin size={15} className="text-tag shrink-0" aria-hidden="true" />
            <span className="truncate">
              {o.ville.nom} <span className="text-ink/60">({o.ville.code_postal})</span>
            </span>
          </>
        )}
      </li>
    );
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Rechercher une ville ou un commerce
      </label>
      <Search
        size={17}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50 pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={listeVisible && options.length > 0}
        aria-controls={`${id}-liste`}
        aria-autocomplete="list"
        aria-activedescendant={listeVisible && actif >= 0 ? `${id}-option-${actif}` : undefined}
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setOuvert(true);
          setActif(-1);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onKeyDown={onKeyDown}
        placeholder="Une ville, un commerce…"
        autoComplete="off"
        className="w-full rounded-full border border-ink/15 bg-surface pl-10 pr-4 py-2.5 text-sm text-ink shadow-soft focus:border-teal transition-colors"
      />

      {/* Toujours monté : une région `status` n'annonce de façon fiable que
          les changements survenus après son apparition. */}
      <p role="status" className="sr-only">
        {statut}
      </p>

      {listeVisible && (
        <div className="absolute z-20 mt-1.5 w-full max-h-80 overflow-auto rounded-control border border-ink/10 bg-surface py-1 shadow-raised">
          {options.length > 0 && (
            <ul id={`${id}-liste`} role="listbox" aria-label="Suggestions">
              {commercesTrouves.length > 0 && (
                <li role="presentation">
                  <p aria-hidden="true" className={INTERTITRE}>
                    Commerces
                  </p>
                  <ul role="group" aria-label="Commerces">
                    {options.slice(0, commercesTrouves.length).map((o, i) => ligne(o, i))}
                  </ul>
                </li>
              )}
              {villes.length > 0 && (
                <li role="presentation">
                  <p aria-hidden="true" className={INTERTITRE}>
                    Villes
                  </p>
                  <ul role="group" aria-label="Villes">
                    {options.slice(commercesTrouves.length).map((o, j) => ligne(o, commercesTrouves.length + j))}
                  </ul>
                </li>
              )}
            </ul>
          )}
          {/* Doublon visuel de la région `status` ci-dessus, masqué aux
              lecteurs d'écran pour ne pas être lu deux fois. */}
          {(chargement || echec || options.length === 0) && (
            <p
              aria-hidden="true"
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm ${echec ? "text-tag" : "text-ink/70"}`}
            >
              {chargement && <Spinner size={12} />}
              {chargement ? "Recherche des villes…" : echec ? MESSAGE_ECHEC : messageVide}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const INTERTITRE = "px-3.5 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/70";
const MESSAGE_ECHEC = "La recherche de villes est indisponible. Vérifie ta connexion.";
const MESSAGE_VIDE = "Aucune ville ni aucun commerce ne correspond.";
const MESSAGE_TROP_COURT = "Aucun commerce ne correspond. Tape au moins 3 lettres pour chercher une ville.";

function FicheCommerce({ commerce, onFermer }: { commerce: Commerce; onFermer: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Le focus entre dans la fiche à l'ouverture : un lecteur d'écran l'annonce,
  // et sur téléphone le clavier virtuel de la recherche se replie. Il revient
  // à la fermeture là où il était (champ de recherche, repère…).
  useEffect(() => {
    const precedent = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => precedent?.focus();
  }, [commerce.id]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={commerce.nom_enseigne}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onFermer();
      }}
      className="absolute inset-x-3 bottom-3 z-[1000] max-h-[65%] overflow-y-auto rounded-card border border-ink/10 bg-surface p-4 shadow-raised outline-none"
    >
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        className="press absolute top-2 right-2 p-1.5 rounded-full text-ink/60 hover:bg-ink/5"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3 pr-8">
        <Avatar pseudo={commerce.nom_enseigne} url={commerce.logo_url} size={44} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2">
            <span className="font-bold text-ink break-words">{commerce.nom_enseigne}</span>
            <Note note={commerce.note} />
          </p>
          {commerce.adresse && <p className="text-xs text-ink/60 truncate">{commerce.adresse}</p>}
        </div>
      </div>

      {commerce.deals.length === 0 ? (
        <p className="text-sm text-ink/70 mt-3">Pas d&apos;offre en ce moment.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {commerce.deals.map((d) => {
            const badge = discountLabel(d);
            return (
              <li key={d.id}>
                <Link
                  href={`/bons-plans/${d.id}`}
                  className="press flex items-center justify-between gap-3 rounded-control border border-ink/10 px-3 py-2 hover:bg-ink/5"
                >
                  <span className="text-sm font-semibold text-ink truncate">{d.titre}</span>
                  {badge && <span className="text-tag font-bold text-sm shrink-0">{badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href={`/commercant/${commerce.id}`} className="press mt-3 inline-block text-sm font-semibold text-teal">
        Voir la boutique →
      </Link>
    </div>
  );
}
