"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MOTIF_LABELS: Record<string, string> = {
  contenu_trompeur: "Contenu trompeur",
  arnaque_suspectee: "Arnaque suspectée",
  produit_non_conforme: "Produit non conforme",
  contenu_inapproprie: "Contenu inapproprié",
  doublon: "Doublon",
  autre: "Autre",
};

type Report = {
  id: string;
  target_type: "deal" | "comment" | "merchant";
  deal_id: string | null;
  merchant_id: string | null;
  motif: string;
  reason: string | null;
  status: "en_attente" | "traite" | "rejete";
  created_at: string;
  reporter: { pseudo: string } | null;
  deals: { titre: string; statut: string } | null;
  merchant_profiles: { nom_enseigne: string; suspendu: boolean } | null;
};

type Sort = "date" | "motif";

export default function AdminSignalementsPage() {
  const router = useRouter();
  const [access, setAccess] = useState<"loading" | "denied" | "granted">("loading");
  const [reports, setReports] = useState<Report[]>([]);
  const [sort, setSort] = useState<Sort>("date");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function guard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userRow?.role !== "admin") {
        setAccess("denied");
        return;
      }

      setAccess("granted");
      loadReports();
    }

    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadReports() {
    const { data } = await supabase
      .from("reports")
      .select(
        "id, target_type, deal_id, merchant_id, motif, reason, status, created_at, reporter:reporter_id (pseudo), deals:deal_id (titre, statut), merchant_profiles:merchant_id (nom_enseigne, suspendu)"
      )
      .order("created_at", { ascending: false });
    setReports((data as unknown as Report[]) ?? []);
  }

  async function updateStatus(id: string, status: "traite" | "rejete") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("reports").update({ status, reviewed_by: user?.id }).eq("id", id);
    loadReports();
  }

  async function suspendDeal(dealId: string) {
    await supabase.from("deals").update({ statut: "brouillon" }).eq("id", dealId);
    loadReports();
  }

  async function deleteDeal(dealId: string) {
    await supabase.from("deals").delete().eq("id", dealId);
    loadReports();
  }

  async function toggleSuspendMerchant(merchantId: string, suspendu: boolean) {
    await supabase.from("merchant_profiles").update({ suspendu: !suspendu }).eq("id", merchantId);
    loadReports();
  }

  if (access === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-ink/60">Accès réservé aux administrateurs.</p>
      </main>
    );
  }

  const filtered = showAll ? reports : reports.filter((r) => r.status === "en_attente");
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "motif") return a.motif.localeCompare(b.motif);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-6">Signalements</h1>

        <div className="flex items-center gap-4 mb-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Afficher aussi traités/rejetés
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded border border-ink/20 px-2 py-1 bg-white"
          >
            <option value="date">Trier par date</option>
            <option value="motif">Trier par motif</option>
          </select>
        </div>

        {sorted.length === 0 && <p className="text-ink/50">Aucun signalement.</p>}

        <ul className="space-y-3">
          {sorted.map((r) => (
            <li key={r.id} className="rounded border border-ink/10 bg-white/50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-teal">
                  {r.target_type === "deal" ? "Bon plan" : r.target_type === "merchant" ? "Commerçant" : "Commentaire"}
                </span>
                <span className="text-xs text-ink/40">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>

              {r.target_type === "deal" && r.deal_id && (
                <Link href={`/bons-plans/${r.deal_id}`} className="font-medium text-ink underline block mb-1">
                  {r.deals?.titre ?? "(annonce supprimée)"}
                </Link>
              )}
              {r.target_type === "merchant" && r.merchant_id && (
                <Link
                  href={`/commercant/${r.merchant_id}`}
                  className="font-medium text-ink underline block mb-1"
                >
                  {r.merchant_profiles?.nom_enseigne ?? "(commerçant supprimé)"}
                  {r.merchant_profiles?.suspendu && (
                    <span className="text-tag text-xs ml-2">(suspendu)</span>
                  )}
                </Link>
              )}

              <p className="text-sm text-ink/70 mb-1">
                Motif : <strong>{MOTIF_LABELS[r.motif] ?? r.motif}</strong>
                {r.reporter?.pseudo && <span className="text-ink/40"> · signalé par {r.reporter.pseudo}</span>}
              </p>
              {r.reason && <p className="text-sm text-ink/60 mb-2">« {r.reason} »</p>}

              <p className="text-sm mb-3">
                Statut :{" "}
                <span
                  className={
                    r.status === "en_attente"
                      ? "text-marigold"
                      : r.status === "traite"
                        ? "text-teal"
                        : "text-ink/40"
                  }
                >
                  {r.status === "en_attente" ? "En attente" : r.status === "traite" ? "Traité" : "Rejeté"}
                </span>
              </p>

              <div className="flex flex-wrap gap-2 text-sm">
                {r.status === "en_attente" && (
                  <>
                    <button
                      onClick={() => updateStatus(r.id, "traite")}
                      className="rounded border border-teal text-teal px-3 py-1"
                    >
                      Marquer traité
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, "rejete")}
                      className="rounded border border-ink/20 text-ink px-3 py-1"
                    >
                      Rejeter
                    </button>
                  </>
                )}

                {r.target_type === "deal" && r.deal_id && r.deals?.statut === "publie" && (
                  <button
                    onClick={() => suspendDeal(r.deal_id!)}
                    className="rounded border border-tag text-tag px-3 py-1"
                  >
                    Suspendre l&apos;annonce
                  </button>
                )}
                {r.target_type === "deal" && r.deal_id && (
                  <button
                    onClick={() => deleteDeal(r.deal_id!)}
                    className="rounded bg-tag text-white px-3 py-1"
                  >
                    Supprimer l&apos;annonce
                  </button>
                )}
                {r.target_type === "merchant" && r.merchant_id && (
                  <button
                    onClick={() => toggleSuspendMerchant(r.merchant_id!, r.merchant_profiles?.suspendu ?? false)}
                    className="rounded border border-tag text-tag px-3 py-1"
                  >
                    {r.merchant_profiles?.suspendu ? "Réactiver le commerçant" : "Suspendre le commerçant"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
