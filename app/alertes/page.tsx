"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CitySearchInput } from "@/components/CitySearchInput";
import { resolveCity, type BanSuggestion } from "@/lib/cities";

type Category = { id: string; nom: string };

type AlertRule = {
  id: string;
  actif: boolean;
  mots_cles: string | null;
  budget_max: number | null;
  cities: { nom: string; code_postal: string } | null;
  categories: { nom: string } | null;
};

export default function AlertesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [city, setCity] = useState<{ id: string; nom: string; code_postal: string } | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [motsCles, setMotsCles] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

      const { data: cats } = await supabase.from("categories").select("id, nom").order("nom");
      setCategories(cats ?? []);

      await loadRules(user.id);
      setLoading(false);
    }

    load();
  }, [router]);

  async function loadRules(uid: string) {
    const { data } = await supabase
      .from("alert_rules")
      .select("id, actif, mots_cles, budget_max, cities:city_id (nom, code_postal), categories:category_id (nom)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRules((data as unknown as AlertRule[]) ?? []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!city) {
      setError("Choisis une ville.");
      return;
    }
    if (!categoryId) {
      setError("Choisis une catégorie.");
      return;
    }

    setCreating(true);

    const { error: insertError } = await supabase.from("alert_rules").insert({
      user_id: userId,
      city_id: city.id,
      category_id: categoryId,
      mots_cles: motsCles.trim() || null,
      budget_max: budgetMax ? Number(budgetMax) : null,
    });

    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCity(null);
    setCategoryId("");
    setMotsCles("");
    setBudgetMax("");
    if (userId) loadRules(userId);
  }

  async function handleToggle(rule: AlertRule) {
    await supabase.from("alert_rules").update({ actif: !rule.actif }).eq("id", rule.id);
    if (userId) loadRules(userId);
  }

  async function handleDelete(id: string) {
    await supabase.from("alert_rules").delete().eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleCitySelect(suggestion: BanSuggestion) {
    setError(null);
    try {
      const resolved = await resolveCity(suggestion);
      setCity(resolved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
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
        <h1 className="text-2xl font-bold text-ink mb-2">Mes alertes</h1>
        <p className="text-sm text-ink/60 mb-6">
          Sois prévenu par email dès qu&apos;un bon plan correspond à tes critères.
        </p>

        <form onSubmit={handleCreate} className="rounded border border-ink/10 bg-white/50 p-4 mb-6">
          <label className="block mb-3">
            <span className="text-sm text-ink/70">Ville</span>
            <div className="mt-1">
              <CitySearchInput onSelect={handleCitySelect} placeholder="Rechercher une ville" />
            </div>
            {city && <p className="text-sm text-teal mt-1">{city.nom} ({city.code_postal})</p>}
          </label>

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

          <label className="block mb-3">
            <span className="text-sm text-ink/70">Mots-clés (optionnel)</span>
            <input
              type="text"
              value={motsCles}
              onChange={(e) => setMotsCles(e.target.value)}
              placeholder="ex : viennoiserie"
              className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-ink/70">Budget maximum en € (optionnel)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
            />
          </label>

          {error && <p className="text-tag text-sm mb-3">{error}</p>}

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded bg-teal text-white py-2 font-medium disabled:opacity-50"
          >
            {creating ? "..." : "Créer l'alerte"}
          </button>
        </form>

        {rules.length === 0 ? (
          <p className="text-ink/50 text-sm">Aucune alerte pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r.id} className="rounded border border-ink/10 bg-white/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {r.categories?.nom} · {r.cities?.nom}
                    </p>
                    {(r.mots_cles || r.budget_max) && (
                      <p className="text-sm text-ink/50">
                        {r.mots_cles && `"${r.mots_cles}"`}
                        {r.mots_cles && r.budget_max ? " · " : ""}
                        {r.budget_max && `max ${r.budget_max} €`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(r)}
                      className={`text-sm ${r.actif ? "text-teal" : "text-ink/40"}`}
                    >
                      {r.actif ? "Active" : "Désactivée"}
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-tag text-sm">
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
