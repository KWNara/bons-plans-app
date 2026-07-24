"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/compte");
  }

  async function handleOAuth(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/compte` },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6">Connexion</h1>

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-ink/20 px-3 py-2"
          />
        </label>

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-teal text-white py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-ink/40">
          <span className="flex-1 h-px bg-ink/10" />
          ou
          <span className="flex-1 h-px bg-ink/10" />
        </div>

        <button
          type="button"
          onClick={() => handleOAuth("google")}
          className="w-full rounded border border-ink/20 py-2 font-medium mb-2"
        >
          Continuer avec Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("apple")}
          className="w-full rounded border border-ink/20 py-2 font-medium"
        >
          Continuer avec Apple
        </button>

        <p className="mt-4 text-sm text-ink/70 text-center">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-teal underline">
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </main>
  );
}
