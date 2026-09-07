"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/ui/AuthShell";
import { FormInput } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { GoogleIcon } from "@/components/ui/BrandIcons";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/compte` },
    });
  }

  return (
    <AuthShell title="Connexion" subtitle="Content de te revoir">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block mb-4">
          <span className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Mot de passe</span>
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              required
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

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50"
        >
          {loading && <Spinner size={16} />}
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink/60">
          <span className="flex-1 h-px bg-ink/10" />
          ou
          <span className="flex-1 h-px bg-ink/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="press w-full flex items-center justify-center gap-2.5 rounded-control border border-ink/15 py-2.5 font-medium text-sm text-ink hover:bg-paper"
        >
          <GoogleIcon size={16} />
          Continuer avec Google
        </button>

        <p className="mt-5 text-sm text-ink/60 text-center">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-teal underline font-medium">
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
