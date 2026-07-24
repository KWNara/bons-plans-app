"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Category = { id: string; nom: string };

export default function DevenirCommercantPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nomEnseigne, setNomEnseigne] = useState("");
  const [siret, setSiret] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function guardAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "commercant") {
        router.push("/compte");
        return;
      }

      const { data: cats } = await supabase.from("categories").select("id, nom").order("nom");
      setCategories(cats ?? []);
      setChecking(false);
    }

    guardAndLoad();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{14}$/.test(siret)) {
      setError("Le numéro SIRET doit contenir exactement 14 chiffres.");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Ta session a expiré, reconnecte-toi.");
      setLoading(false);
      return;
    }

    let logo_url: string | null = null;

    if (logoFile) {
      const path = `${session.user.id}/${Date.now()}-${logoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(path, logoFile);

      if (uploadError) {
        setError(`Échec de l'upload du logo : ${uploadError.message}`);
        setLoading(false);
        return;
      }

      logo_url = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
    }

    const res = await fetch("/api/merchant/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        siret,
        nom_enseigne: nomEnseigne,
        category_id: categoryId || null,
        logo_url,
      }),
    });

    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Une erreur est survenue.");
      return;
    }

    router.push("/compte");
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-2">Devenir commerçant</h1>
        <p className="text-sm text-ink/60 mb-6">
          Ton SIRET est vérifié automatiquement auprès du registre Sirene.
        </p>

        <label className="block mb-3">
          <span className="text-sm text-ink/70">Nom d&apos;enseigne</span>
          <input
            type="text"
            required
            value={nomEnseigne}
            onChange={(e) => setNomEnseigne(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm text-ink/70">Numéro SIRET (14 chiffres)</span>
          <input
            type="text"
            required
            inputMode="numeric"
            value={siret}
            onChange={(e) => setSiret(e.target.value.replace(/\D/g, ""))}
            maxLength={14}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm text-ink/70">Catégorie d&apos;activité</span>
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

        <label className="block mb-6">
          <span className="text-sm text-ink/70">Logo (optionnel)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </label>

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-teal text-white py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Vérification en cours..." : "Vérifier et activer mon compte pro"}
        </button>
      </form>
    </main>
  );
}
