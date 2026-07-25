"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
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
  const [existingPhotos, setExistingPhotos] = useState<string[]>(existingDeal?.photos ?? []);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: mCities }] = await Promise.all([
        supabase.from("categories").select("id, nom").order("nom"),
        supabase
          .from("merchant_cities")
          .select("city_id, cities:city_id (nom, code_postal)")
          .eq("merchant_id", merchantId),
      ]);
      setCategories(cats ?? []);
      setMerchantCities((mCities as unknown as MerchantCity[]) ?? []);
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

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée, reconnecte-toi.");
      setLoading(false);
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
        setLoading(false);
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
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      stock_limite: stockLimite ? Number(stockLimite) : null,
      statut,
    };

    const dealResult = isEdit
      ? await supabase.from("deals").update(payload).eq("id", existingDeal!.id).select().single()
      : await supabase.from("deals").insert(payload).select().single();

    if (dealResult.error) {
      const message = dealResult.error.message.includes("QUOTA_GRATUIT_ATTEINT")
        ? "Passez à l'offre payante pour publier plus d'annonces."
        : dealResult.error.message;
      setError(message);
      setLoading(false);
      return;
    }

    const dealId = dealResult.data.id;

    if (isEdit) {
      await supabase.from("deal_cities").delete().eq("deal_id", dealId);
    }
    const { error: citiesError } = await supabase
      .from("deal_cities")
      .insert(selectedCityIds.map((city_id) => ({ deal_id: dealId, city_id })));

    setLoading(false);

    if (citiesError) {
      setError(citiesError.message);
      return;
    }

    router.push("/mes-bons-plans");
  }

  if (merchantCities.length === 0) {
    return (
      <p className="text-ink/70">
        Tu dois d&apos;abord ajouter au moins une ville de diffusion depuis{" "}
        <a href="/compte" className="text-teal underline">
          Mon compte
        </a>
        .
      </p>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <label className="block mb-3">
        <span className="text-sm text-ink/70">Titre</span>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
        />
      </label>

      <label className="block mb-3">
        <span className="text-sm text-ink/70">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
        />
      </label>

      <label className="block mb-3">
        <span className="text-sm text-ink/70">Photos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
          className="mt-1 w-full text-sm"
        />
        {existingPhotos.length > 0 && (
          <p className="text-xs text-ink/50 mt-1">{existingPhotos.length} photo(s) déjà en ligne</p>
        )}
      </label>

      <fieldset className="mb-3">
        <legend className="text-sm text-ink/70 mb-1">Réduction</legend>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={priceMode === "prix"}
              onChange={() => setPriceMode("prix")}
            />
            Prix avant/après
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={priceMode === "pourcentage"}
              onChange={() => setPriceMode("pourcentage")}
            />
            % de réduction
          </label>
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
              className="w-1/2 rounded border border-ink/20 px-3 py-2"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix après"
              value={prixApres}
              onChange={(e) => setPrixApres(e.target.value)}
              className="w-1/2 rounded border border-ink/20 px-3 py-2"
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
            className="w-full rounded border border-ink/20 px-3 py-2"
          />
        )}
      </fieldset>

      <label className="block mb-3">
        <span className="text-sm text-ink/70">Catégorie</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
        >
          <option value="">— Choisir —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="mb-3">
        <legend className="text-sm text-ink/70 mb-1">Villes de diffusion</legend>
        <div className="space-y-1">
          {merchantCities.map((mc) => (
            <label key={mc.city_id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCityIds.includes(mc.city_id)}
                onChange={() => toggleCity(mc.city_id)}
              />
              {mc.cities?.nom} ({mc.cities?.code_postal})
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2 mb-3">
        <label className="block w-1/2">
          <span className="text-sm text-ink/70">Date de début</span>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="block w-1/2">
          <span className="text-sm text-ink/70">Date de fin</span>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>
      </div>

      <label className="block mb-6">
        <span className="text-sm text-ink/70">Stock limité (optionnel)</span>
        <input
          type="number"
          min="0"
          placeholder="Illimité si vide"
          value={stockLimite}
          onChange={(e) => setStockLimite(e.target.value)}
          className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
        />
      </label>

      {duplicateWarning && (
        <p className="text-marigold text-sm mb-4">⚠️ {duplicateWarning}</p>
      )}

      {error && <p className="text-tag mb-4 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit("brouillon")}
          className="w-1/2 rounded border border-ink/20 text-ink py-2 font-medium disabled:opacity-50"
        >
          Enregistrer en brouillon
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit("publie")}
          className="w-1/2 rounded bg-teal text-white py-2 font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Publier"}
        </button>
      </div>
    </div>
  );
}
