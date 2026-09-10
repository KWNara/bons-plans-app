"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/ui/AuthShell";
import { Spinner } from "@/components/ui/Spinner";
import { authErrorMessage } from "@/lib/authErrors";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le lien de l'email ouvre une session de récupération. Sans elle, la page a
  // été atteinte directement et le formulaire n'aurait aucun compte à modifier.
  const [state, setState] = useState<"verification" | "pret" | "lien-invalide">("verification");

  useEffect(() => {
    // Supabase traite le fragment de l'URL au chargement puis émet l'événement.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setState("pret");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((current) => (session ? "pret" : current === "pret" ? "pret" : "lien-invalide"));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(authErrorMessage(updateError));
      return;
    }

    router.push("/compte");
  }

  if (state === "verification") {
    return (
      <AuthShell title="Vérification du lien">
        <div className="flex justify-center py-4">
          <Spinner size={24} className="text-teal" />
        </div>
      </AuthShell>
    );
  }

  if (state === "lien-invalide") {
    return (
      <AuthShell title="Lien invalide ou expiré">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-tag/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} className="text-tag" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-ink/70 leading-relaxed mb-5">
            Ce lien de réinitialisation n&apos;est plus valable. Les liens expirent au bout d&apos;une
            heure, et ne servent qu&apos;une fois.
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisis un mot de passe pour ton compte">
      <form onSubmit={handleSubmit}>
        <label className="block mb-4">
          <span className="text-xs font-semibold text-ink/60 uppercase tracking-wide">
            Nouveau mot de passe
          </span>
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-control border border-ink/15 px-3.5 py-2.5 pr-10 text-sm focus:border-teal transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="press absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-ink/60 hover:text-ink"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="block mb-4">
          <span className="text-xs font-semibold text-ink/60 uppercase tracking-wide">
            Confirmation
          </span>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="mt-1.5 w-full rounded-control border border-ink/15 px-3.5 py-2.5 text-sm focus:border-teal transition-colors"
          />
        </label>

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50"
        >
          {loading && <Spinner size={16} />}
          {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
        </button>
      </form>
    </AuthShell>
  );
}
