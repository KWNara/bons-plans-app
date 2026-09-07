"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, BellPlus, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CitySearchInput } from "@/components/CitySearchInput";
import { resolveCity, type BanSuggestion } from "@/lib/cities";
import { FormInput, FormSelect } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

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
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);

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
      setError("L'alerte n'a pas pu être créée. Réessaie dans un instant.");
      return;
    }

    setCity(null);
    setCategoryId("");
    setMotsCles("");
    setBudgetMax("");
    if (userId) loadRules(userId);
  }

  async function handleToggle(rule: AlertRule) {
    if (busyRuleId) return;

    setError(null);
    setBusyRuleId(rule.id);

    const { error: toggleError } = await supabase
      .from("alert_rules")
      .update({ actif: !rule.actif })
      .eq("id", rule.id);

    if (toggleError) {
      setError("Le changement n'a pas pu être enregistré.");
    } else if (userId) {
      await loadRules(userId);
    }

    setBusyRuleId(null);
  }

  async function handleDelete(rule: AlertRule) {
    if (busyRuleId) return;

    const confirmed = window.confirm("Supprimer définitivement cette alerte ?");
    if (!confirmed) return;

    setError(null);
    setBusyRuleId(rule.id);

    const { error: deleteError } = await supabase.from("alert_rules").delete().eq("id", rule.id);

    setBusyRuleId(null);

    if (deleteError) {
      setError("La suppression a échoué. L'alerte est toujours active.");
      return;
    }

    setRules((prev) => prev.filter((r) => r.id !== rule.id));
  }

  async function handleCitySelect(suggestion: BanSuggestion) {
    setError(null);
    try {
      const resolved = await resolveCity(suggestion);
      setCity(resolved);
    } catch {
      setError("Cette ville n'a pas pu être enregistrée. Réessaie dans un instant.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
        <div className="max-w-sm mx-auto">
          <Skeleton className="h-64 w-full rounded-card mb-4" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
      </main>
    );
  }

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

        <h1 className="text-2xl font-extrabold text-ink mb-1">Mes alertes</h1>
        <p className="text-sm text-ink/70 mb-5">
          Sois prévenu par email dès qu&apos;un bon plan correspond à tes critères.
        </p>

        <form
          onSubmit={handleCreate}
          className="bg-white rounded-card shadow-soft border border-ink/10 p-4 mb-6"
        >
          <div className="mb-3.5">
            <CitySearchInput onSelect={handleCitySelect} label="Ville" placeholder="Rechercher une ville" />
            {city && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-teal mt-1.5">
                <MapPin size={14} />
                {city.nom} ({city.code_postal})
              </p>
            )}
          </div>

          <FormSelect
            label="Catégorie"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </FormSelect>

          <FormInput
            label="Mots-clés (optionnel)"
            type="text"
            value={motsCles}
            onChange={(e) => setMotsCles(e.target.value)}
            placeholder="ex : viennoiserie"
          />

          <FormInput
            label="Budget maximum en € (optionnel)"
            type="number"
            min="0"
            step="0.01"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
          />

          {error && <p className="text-tag text-sm mb-3">{error}</p>}

          <button
            type="submit"
            disabled={creating}
            className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50 mt-1"
          >
            {creating && <Spinner size={16} />}
            {creating ? "Création…" : "Créer l'alerte"}
          </button>
        </form>

        {rules.length === 0 ? (
          <EmptyState
            icon={BellPlus}
            title="Aucune alerte"
            description="Crée une alerte pour être prévenu dès qu'un bon plan correspond à ce que tu cherches."
          />
        ) : (
          <ul className="space-y-2.5">
            {rules.map((r) => (
              <li key={r.id} className="bg-white rounded-card shadow-soft border border-ink/10 p-3.5">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink break-words">
                      {r.categories?.nom} · {r.cities?.nom}
                    </p>
                    {(r.mots_cles || r.budget_max) && (
                      <p className="text-sm text-ink/70 break-words">
                        {r.mots_cles && `« ${r.mots_cles} »`}
                        {r.mots_cles && r.budget_max ? " · " : ""}
                        {r.budget_max && `max ${r.budget_max} €`}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                      r.actif ? "bg-teal/10 text-teal" : "bg-ink/10 text-ink/70"
                    }`}
                  >
                    {r.actif ? "Active" : "En pause"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(r)}
                    disabled={busyRuleId === r.id}
                    className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 px-3 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
                  >
                    {r.actif ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                    {r.actif ? "Mettre en pause" : "Réactiver"}
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={busyRuleId === r.id}
                    className="press inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-tag hover:bg-tag/10 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
