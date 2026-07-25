"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Store, ShieldCheck, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormInput, FormSelect } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";

type Category = { id: string; nom: string };

export default function DevenirCommercantPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nomEnseigne, setNomEnseigne] = useState("");
  const [siret, setSiret] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

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
      <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
        <div className="max-w-sm mx-auto pt-8">
          <Skeleton className="h-24 w-full rounded-card mb-4" />
          <Skeleton className="h-11 w-full rounded-control mb-3" />
          <Skeleton className="h-11 w-full rounded-control" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-sm mx-auto">
        <Link
          href="/compte"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <div className="bg-white rounded-card shadow-soft border border-ink/8 p-6">
          <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mb-3">
            <Store size={22} className="text-teal" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-extrabold text-ink mb-1">Devenir commerçant</h1>
          <p className="text-sm text-ink/50 mb-6 flex items-start gap-1.5">
            <ShieldCheck size={15} className="text-teal shrink-0 mt-0.5" />
            Ton SIRET est vérifié automatiquement auprès du registre Sirene.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 mb-3.5">
              <div className="relative shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-paper border border-dashed border-ink/20 flex items-center justify-center">
                    <Store size={18} className="text-ink/30" />
                  </div>
                )}
                <label className="press absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center cursor-pointer">
                  <Camera size={10} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <p className="text-xs text-ink/45">Logo de ton enseigne (optionnel)</p>
            </div>

            <FormInput
              label="Nom d'enseigne"
              type="text"
              required
              value={nomEnseigne}
              onChange={(e) => setNomEnseigne(e.target.value)}
            />

            <FormInput
              label="Numéro SIRET (14 chiffres)"
              type="text"
              required
              inputMode="numeric"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, ""))}
              maxLength={14}
              placeholder="00000000000000"
            />

            <FormSelect label="Catégorie d'activité" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </FormSelect>

            {error && <p className="text-tag mb-4 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50 mt-2"
            >
              {loading && <Spinner size={16} />}
              {loading ? "Vérification en cours..." : "Vérifier et activer mon compte pro"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
