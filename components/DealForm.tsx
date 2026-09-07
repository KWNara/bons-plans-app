"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, X, AlertTriangle, Tag, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormInput, FormTextarea, FormSelect } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { endOfDayIso, startOfDayIso } from "@/lib/dealFormat";

type Category = { id: string; nom: string };
type MerchantCity = { city_id: string; cities: { nom: string; code_postal: string } | null };

type ExistingDeal = {
  id: string;
  titre: string;
  description: string | null;
  photos: string[];
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  category_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  stock_limite: number | null;
  statut: "brouillon" | "publie" | "expire";
  selectedCityIds: string[];
};

type Props = {
  merchantId: string;
  existingDeal?: ExistingDeal;
};

// Les dates sont stockées bornées sur la journée locale (cf. startOfDayIso) :
// « 10 septembre 00 h 00 » à Paris vaut « 9 septembre 22 h 00 » en UTC. Tronquer
// la chaîne ISO afficherait donc la veille dans le formulaire d'édition.
// Les messages de Postgres/PostgREST ne sont jamais montrables à un
// commerçant : ils sont en anglais et parlent de contraintes techniques.
function humanizeDealError(message: string): string {
  if (message.includes("QUOTA_GRATUIT_ATTEINT")) {
    return "Tu as atteint la limite de 3 bons plans actifs du plan gratuit. Passe en Pro pour en publier plus.";
  }
  if (message.includes("deals_reduction_pourcentage_range")) {
    return "La réduction doit être comprise entre 1 % et 99 %.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Tu n'as pas les droits nécessaires pour cette action.";
  }
  return "L'enregistrement a échoué. Vérifie les champs et réessaie.";
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DealForm({ merchantId, existingDeal }: Props) {
  const router = useRouter();
  const isEdit = !!existingDeal;

  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantCities, setMerchantCities] = useState<MerchantCity[]>([]);

  const [titre, setTitre] = useState(existingDeal?.titre ?? "");
  const [description, setDescription] = useState(existingDeal?.description ?? "");
  const [priceMode, setPriceMode] = useState<"prix" | "pourcentage">(
    existingDeal?.reduction_pourcentage ? "pourcentage" : "prix"
  );
  const [prixAvant, setPrixAvant] = useState(existingDeal?.prix_avant?.toString() ?? "");
  const [prixApres, setPrixApres] = useState(existingDeal?.prix_apres?.toString() ?? "");
  const [reductionPourcentage, setReductionPourcentage] = useState(
    existingDeal?.reduction_pourcentage?.toString() ?? ""
  );
  const [categoryId, setCategoryId] = useState(existingDeal?.category_id ?? "");
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>(
    existingDeal?.selectedCityIds ?? []
  );
  const [dateDebut, setDateDebut] = useState(toDateInputValue(existingDeal?.date_debut ?? null));
  const [dateFin, setDateFin] = useState(toDateInputValue(existingDeal?.date_fin ?? null));
  const [stockLimite, setStockLimite] = useState(existingDeal?.stock_limite?.toString() ?? "");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(existingDeal?.photos ?? []);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"brouillon" | "publie" | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesLoadFailed, setCitiesLoadFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: mCities, error: citiesError }] = await Promise.all([
        supabase.from("categories").select("id, nom").order("nom"),
        supabase
          .from("merchant_cities")
          .select("city_id, cities:city_id (nom, code_postal)")
          .eq("merchant_id", merchantId),
      ]);

      setCategories(cats ?? []);

      // Distinguer « pas encore chargé », « échec » et « réellement aucune
      // ville » : sinon le formulaire affiche à tort « ajoute d'abord une ville »
      // pendant le chargement, et définitivement en cas d'erreur réseau.
      if (citiesError) {
        setCitiesLoadFailed(true);
      } else {
        setMerchantCities((mCities as unknown as MerchantCity[]) ?? []);
      }

      setCitiesLoading(false);
    }
    load();
  }, [merchantId]);

  // Avertissement non bloquant si une annonce très similaire existe déjà
  // (même titre, même commerçant, une ville en commun) — cf Point 9 #5.
  useEffect(() => {
    if (!titre.trim() || selectedCityIds.length === 0) {
      setDuplicateWarning(null);
      return;
    }

    const timeout = setTimeout(async () => {
      let query = supabase
        .from("deals")
        .select("id, deal_cities!inner(city_id)")
        .eq("merchant_id", merchantId)
        .ilike("titre", titre.trim())
        .in("deal_cities.city_id", selectedCityIds)
        .limit(1);

      if (isEdit) query = query.neq("id", existingDeal!.id);

      const { data } = await query;
      setDuplicateWarning(
        data && data.length > 0
          ? "Une annonce avec ce même titre existe déjà dans une de ces villes pour ton compte. Tu peux quand même publier si ce n'est pas un doublon."
          : null
      );
    }, 500);

    return () => clearTimeout(timeout);
  }, [titre, selectedCityIds, merchantId, isEdit, existingDeal]);

  function toggleCity(cityId: string) {
    setSelectedCityIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  }

  function handlePhotoChange(files: FileList | null) {
    const added = Array.from(files ?? []);
    if (added.length === 0) return;

    // Ajout et non remplacement : le sélecteur ne renvoie que les fichiers du
    // dernier choix, écraser la liste effaçait silencieusement les photos
    // choisies aux tours précédents.
    setPhotoFiles((previous) => [...previous, ...added]);
    setPhotoPreviews((previous) => [...previous, ...added.map((f) => URL.createObjectURL(f))]);
  }

  function removeNewPhoto(index: number) {
    setPhotoFiles((previous) => previous.filter((_, i) => i !== index));
    setPhotoPreviews((previous) => {
      URL.revokeObjectURL(previous[index]);
      return previous.filter((_, i) => i !== index);
    });
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos((prev) => prev.filter((p) => p !== url));
  }

  async function handleSubmit(statut: "brouillon" | "publie") {
    setError(null);

    if (!titre.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (selectedCityIds.length === 0) {
      setError("Choisis au moins une ville de diffusion.");
      return;
    }
    if (dateDebut && dateFin && dateFin < dateDebut) {
      setError("La date de fin doit être après la date de début.");
      return;
    }

    // Les attributs min/max des champs ne sont pas appliqués : les boutons sont
    // de type "button" et il n'y a pas de <form>, donc la validation native du
    // navigateur ne se déclenche jamais. Sans ces contrôles, un prix négatif
    // part en base et la carte affiche une réduction absurde (« -150 % »).
    const avant = prixAvant ? Number(prixAvant) : null;
    const apres = prixApres ? Number(prixApres) : null;
    const pourcentage = reductionPourcentage ? Number(reductionPourcentage) : null;

    if (priceMode === "prix") {
      if ((avant !== null && avant < 0) || (apres !== null && apres < 0)) {
        setError("Les prix ne peuvent pas être négatifs.");
        return;
      }
      if (avant !== null && apres !== null && apres >= avant) {
        setError("Le prix réduit doit être inférieur au prix initial.");
        return;
      }
    }

    if (priceMode === "pourcentage" && pourcentage !== null && (pourcentage < 1 || pourcentage > 99)) {
      setError("La réduction doit être comprise entre 1 % et 99 %.");
      return;
    }

    if (stockLimite && Number(stockLimite) < 0) {
      setError("Le stock ne peut pas être négatif.");
      return;
    }

    if (statut === "publie" && dateFin && endOfDayIso(dateFin) <= new Date().toISOString()) {
      setError("La date de fin est déjà passée : le bon plan ne serait visible par personne.");
      return;
    }

    setLoading(statut);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée, reconnecte-toi.");
      setLoading(null);
      return;
    }

    const uploadedUrls: string[] = [];
    for (const file of photoFiles) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("deal-photos")
        .upload(path, file);
      if (uploadError) {
        setError(`Échec de l'upload d'une photo : ${uploadError.message}`);
        setLoading(null);
        return;
      }
      uploadedUrls.push(supabase.storage.from("deal-photos").getPublicUrl(path).data.publicUrl);
    }

    const payload = {
      merchant_id: merchantId,
      titre: titre.trim(),
      description: description.trim() || null,
      photos: [...existingPhotos, ...uploadedUrls],
      prix_avant: priceMode === "prix" && prixAvant ? Number(prixAvant) : null,
      prix_apres: priceMode === "prix" && prixApres ? Number(prixApres) : null,
      reduction_pourcentage:
        priceMode === "pourcentage" && reductionPourcentage
          ? Number(reductionPourcentage)
          : null,
      category_id: categoryId || null,
      date_debut: dateDebut ? startOfDayIso(dateDebut) : null,
      date_fin: dateFin ? endOfDayIso(dateFin) : null,
      stock_limite: stockLimite ? Number(stockLimite) : null,
      statut,
    };

    const dealResult = isEdit
      ? await supabase.from("deals").update(payload).eq("id", existingDeal!.id).select().single()
      : await supabase.from("deals").insert(payload).select().single();

    if (dealResult.error) {
      setError(humanizeDealError(dealResult.error.message));
      setLoading(null);
      return;
    }

    const dealId = dealResult.data.id;

    // Les villes de diffusion sont ajoutées avant de retirer les anciennes :
    // dans l'ordre inverse, un échec d'insertion laissait le bon plan sans
    // aucune ville, invisible dans tous les fils tout en comptant dans le quota.
    const { error: citiesError } = await supabase
      .from("deal_cities")
      .upsert(
        selectedCityIds.map((city_id) => ({ deal_id: dealId, city_id })),
        { onConflict: "deal_id,city_id", ignoreDuplicates: true }
      );

    if (citiesError) {
      setLoading(null);
      setError("Les villes de diffusion n'ont pas pu être enregistrées. Réessaie.");
      return;
    }

    if (isEdit) {
      await supabase
        .from("deal_cities")
        .delete()
        .eq("deal_id", dealId)
        .not("city_id", "in", `(${selectedCityIds.join(",")})`);
    }

    setLoading(null);
    router.push("/mes-bons-plans");
  }

  if (citiesLoading) {
    return (
      <div className="w-full max-w-sm bg-white rounded-card shadow-soft border border-ink/10 p-5 space-y-3">
        <Skeleton className="h-11 w-full rounded-control" />
        <Skeleton className="h-24 w-full rounded-control" />
        <Skeleton className="h-11 w-full rounded-control" />
      </div>
    );
  }

  if (citiesLoadFailed) {
    return (
      <ErrorState
        title="Chargement impossible"
        description="Tes villes de diffusion n'ont pas pu être récupérées."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (merchantCities.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-soft border border-ink/10 p-6 text-center">
        <p className="text-ink/70 text-sm">
          Tu dois d&apos;abord ajouter au moins une ville de diffusion depuis{" "}
          <Link href="/compte" className="text-teal underline font-medium">
            Mon compte
          </Link>
          .
        </p>
      </div>
    );
  }

  const allPhotos = [...existingPhotos, ...photoPreviews];

  return (
    <div className="w-full max-w-sm bg-white rounded-card shadow-soft border border-ink/10 p-5">
      <FormInput label="Titre" type="text" value={titre} onChange={(e) => setTitre(e.target.value)} />

      <FormTextarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <label className="block mb-3.5">
        <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Photos</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {allPhotos.map((url, i) => {
            const isExisting = i < existingPhotos.length;
            return (
              <div key={url + i} className="relative w-16 h-16 rounded-control overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label={`Retirer la photo ${i + 1}`}
                  onClick={() =>
                    isExisting ? removeExistingPhoto(url) : removeNewPhoto(i - existingPhotos.length)
                  }
                  className="press absolute top-0 right-0 w-7 h-7 flex items-center justify-center text-white"
                >
                  <span className="w-5 h-5 rounded-full bg-ink/70 flex items-center justify-center">
                    <X size={11} />
                  </span>
                </button>
              </div>
            );
          })}
          <label className="press w-16 h-16 rounded-control border-2 border-dashed border-ink/20 flex items-center justify-center cursor-pointer text-ink/40 hover:border-teal hover:text-teal">
            <ImagePlus size={20} />
            <span className="sr-only">Ajouter des photos</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePhotoChange(e.target.files);
                // Réinitialise l'input, sinon resélectionner le même fichier
                // ne déclenche pas d'événement change.
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </label>

      <fieldset className="mb-3.5">
        <legend className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">Réduction</legend>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            type="button"
            onClick={() => setPriceMode("prix")}
            className={`press flex items-center justify-center gap-1.5 rounded-control border py-2 text-sm font-medium transition-colors ${
              priceMode === "prix" ? "border-teal bg-teal/10 text-teal" : "border-ink/15 text-ink/60"
            }`}
          >
            <Tag size={14} /> Prix avant/après
          </button>
          <button
            type="button"
            onClick={() => setPriceMode("pourcentage")}
            className={`press flex items-center justify-center gap-1.5 rounded-control border py-2 text-sm font-medium transition-colors ${
              priceMode === "pourcentage" ? "border-teal bg-teal/10 text-teal" : "border-ink/15 text-ink/60"
            }`}
          >
            <Percent size={14} /> Réduction
          </button>
        </div>

        {priceMode === "prix" ? (
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix avant"
              value={prixAvant}
              onChange={(e) => setPrixAvant(e.target.value)}
              className="w-1/2 rounded-control border border-ink/15 px-3 py-2.5 text-sm focus:border-teal"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix après"
              value={prixApres}
              onChange={(e) => setPrixApres(e.target.value)}
              className="w-1/2 rounded-control border border-ink/15 px-3 py-2.5 text-sm focus:border-teal"
            />
          </div>
        ) : (
          <input
            type="number"
            min="1"
            max="99"
            placeholder="% de réduction"
            value={reductionPourcentage}
            onChange={(e) => setReductionPourcentage(e.target.value)}
            className="w-full rounded-control border border-ink/15 px-3 py-2.5 text-sm focus:border-teal"
          />
        )}
      </fieldset>

      <FormSelect label="Catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">— Choisir —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </FormSelect>

      <fieldset className="mb-3.5">
        <legend className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
          Villes de diffusion
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {merchantCities.map((mc) => {
            const active = selectedCityIds.includes(mc.city_id);
            return (
              <button
                type="button"
                key={mc.city_id}
                onClick={() => toggleCity(mc.city_id)}
                className={`press rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-ink text-white border-ink" : "bg-white text-ink/70 border-ink/15"
                }`}
              >
                {mc.cities?.nom} ({mc.cities?.code_postal})
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <div className="w-1/2">
          <FormInput label="Début" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        </div>
        <div className="w-1/2">
          <FormInput label="Fin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
        </div>
      </div>

      <FormInput
        label="Stock limité (optionnel)"
        type="number"
        min="0"
        placeholder="Illimité si vide"
        value={stockLimite}
        onChange={(e) => setStockLimite(e.target.value)}
      />

      {duplicateWarning && (
        <p className="flex items-start gap-1.5 text-marigold text-sm bg-marigold/10 rounded-control px-3 py-2.5 mb-4">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {duplicateWarning}
        </p>
      )}

      {error && <p className="text-tag mb-4 text-sm">{error}</p>}

      <div className="flex gap-2 mt-1">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => {
            // Repasser une annonce en ligne au statut brouillon la retire du
            // fil : l'action mérite une confirmation explicite.
            if (existingDeal?.statut === "publie") {
              const confirmed = window.confirm(
                "Ce bon plan est actuellement en ligne. Le repasser en brouillon le retirera du fil. Continuer ?"
              );
              if (!confirmed) return;
            }
            handleSubmit("brouillon");
          }}
          className="press w-1/2 flex items-center justify-center gap-2 rounded-control border border-ink/15 text-ink py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading === "brouillon" && <Spinner size={14} />}
          {existingDeal?.statut === "publie" ? "Dépublier" : "Brouillon"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleSubmit("publie")}
          className="press w-1/2 flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 text-sm font-semibold shadow-soft disabled:opacity-50"
        >
          {loading === "publie" && <Spinner size={14} />}
          {existingDeal?.statut === "publie" ? "Enregistrer" : "Publier"}
        </button>
      </div>
    </div>
  );
}
