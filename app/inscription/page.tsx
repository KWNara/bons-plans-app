"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Eye, EyeOff, User, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/ui/AuthShell";
import { FormInput } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";

export default function InscriptionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [role, setRole] = useState<"particulier" | "commercant">("particulier");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { pseudo },
        emailRedirectTo: `${window.location.origin}/compte`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push(role === "commercant" ? "/devenir-commercant" : "/compte");
    } else {
      setConfirmationPending(true);
    }
  }

  if (confirmationPending) {
    return (
      <AuthShell title="Vérifie ta boîte mail">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-teal" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-ink/70 leading-relaxed">
            On t&apos;a envoyé un lien de confirmation à <strong className="text-ink">{email}</strong>.
            Clique dessus puis reviens te{" "}
            <Link href="/connexion" className="text-teal underline font-medium">
              connecter
            </Link>
            .
          </p>
          {role === "commercant" && (
            <p className="mt-3 text-sm text-ink/70 leading-relaxed">
              Une fois connecté(e), va dans <strong className="text-ink">Mon compte</strong> pour
              compléter ton profil commerçant (SIRET, enseigne, logo).
            </p>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Rejoins les bons plans de ta ville">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Pseudo"
          type="text"
          required
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
        />

        <FormInput
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block mb-4">
          <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Mot de passe</span>
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-control border border-ink/15 px-3.5 py-2.5 pr-10 text-sm focus:border-teal transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="press absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-ink/40 hover:text-ink"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <fieldset className="mb-6">
          <legend className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">
            Je suis un(e)...
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("particulier")}
              className={`press flex flex-col items-center gap-1.5 rounded-control border py-3 text-sm font-semibold transition-colors ${
                role === "particulier"
                  ? "border-teal bg-teal/8 text-teal"
                  : "border-ink/15 text-ink/60"
              }`}
            >
              <User size={18} />
              Particulier
            </button>
            <button
              type="button"
              onClick={() => setRole("commercant")}
              className={`press flex flex-col items-center gap-1.5 rounded-control border py-3 text-sm font-semibold transition-colors ${
                role === "commercant"
                  ? "border-teal bg-teal/8 text-teal"
                  : "border-ink/15 text-ink/60"
              }`}
            >
              <Store size={18} />
              Commerçant
            </button>
          </div>
        </fieldset>

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50"
        >
          {loading && <Spinner size={16} />}
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="mt-5 text-sm text-ink/60 text-center">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-teal underline font-medium">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
