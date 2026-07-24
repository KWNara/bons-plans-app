"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function InscriptionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-ink mb-3">Vérifie ta boîte mail 📬</h1>
          <p className="text-ink/70">
            On t&apos;a envoyé un lien de confirmation à <strong>{email}</strong>. Clique dessus
            puis reviens te{" "}
            <Link href="/connexion" className="text-teal underline">
              connecter
            </Link>
            .
          </p>
          {role === "commercant" && (
            <p className="mt-3 text-ink/70">
              Une fois connecté(e), va dans <strong>Mon compte</strong> pour compléter ton profil
              commerçant (SIRET, enseigne, logo).
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6">Créer un compte</h1>

        <label className="block mb-3">
          <span className="text-sm text-ink/70">Pseudo</span>
          <input
            type="text"
            required
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm text-ink/70">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-ink/70">Mot de passe</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>

        <fieldset className="mb-6">
          <legend className="text-sm text-ink/70 mb-2">Je suis un(e)...</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                checked={role === "particulier"}
                onChange={() => setRole("particulier")}
              />
              Particulier
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                checked={role === "commercant"}
                onChange={() => setRole("commercant")}
              />
              Commerçant
            </label>
          </div>
        </fieldset>

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-teal text-white py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="mt-4 text-sm text-ink/70 text-center">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-teal underline">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}
