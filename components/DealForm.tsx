"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, AlertTriangle, Tag, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormInput, FormTextarea, FormSelect } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";

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
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(existingDeal?.photos ?? []);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"brouillon" | "publie" | null>(null);
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

  function handlePhotoChange(files: FileList | null) {
    const list = Array.from(files ?? []);
    setPhotoFiles(list);
    setPhotoPreviews(list.map((f) => URL.createObjectURL(f)));
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
      setLoading(null);
      return;
    }

    const dealId = dealResult.data.id;

    if (isEdit) {
      await supabase.from("deal_cities").delete().eq("deal_id", dealId);
    }
    const { error: citiesError } = await supabase
      .from("deal_cities")
      .insert(selectedCityIds.map((city_id) => ({ deal_id: dealId, city_id })));

    setLoading(null);

    if (citiesError) {
      setError(citiesError.message);
      return;
    }

    router.push("/mes-bons-plans");
  }

  if (merchantCities.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-soft border border-ink/8 p-6 text-center">
        <p className="text-ink/70 text-sm">
          Tu dois d&apos;abord ajouter au moins une ville de diffusion depuis{" "}
          <a href="/compte" className="text-teal underline font-medium">
            Mon compte
          </a>
          .
        </p>
      </div>
    );
  }

  const allPhotos = [...existingPhotos, ...photoPreviews];

  return (
    <div className="w-full max-w-sm bg-white rounded-card shadow-soft border border-ink/8 p-5">
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
          {allPhotos.map((url, i) => (
            <div key={url + i} className="relative w-16 h-16 rounded-control overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {i < existingPhotos.length && (
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  className="press absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink/70 text-white flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
          <label className="press w-16 h-16 rounded-control border-2 border-dashed border-ink/20 flex items-center justify-center cursor-pointer text-ink/35 hover:border-teal hover:text-teal">
            <ImagePlus size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files)}
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
              priceMode === "prix" ? "border-teal bg-teal/8 text-teal" : "border-ink/15 text-ink/60"
            }`}
          >
            <Tag size={14} /> Prix avant/après
          </button>
          <button
            type="button"
            onClick={() => setPriceMode("pourcentage")}
            className={`press flex items-center justify-center gap-1.5 rounded-control border py-2 text-sm font-medium transition-colors ${
              priceMode === "pourcentage" ? "border-teal bg-teal/8 text-teal" : "border-ink/15 text-ink/60"
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
          onClick={() => handleSubmit("brouillon")}
          className="press w-1/2 flex items-center justify-center gap-2 rounded-control border border-ink/15 text-ink py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {loading === "brouillon" && <Spinner size={14} />}
          Brouillon
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleSubmit("publie")}
          className="press w-1/2 flex items-center justify-center gap-2 rounded-control bg-teal text-white py-2.5 text-sm font-semibold shadow-soft disabled:opacity-50"
        >
          {loading === "publie" && <Spinner size={14} />}
          Publier
        </button>
      </div>
    </div>
  );
}
