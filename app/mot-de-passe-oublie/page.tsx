"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/ui/AuthShell";
import { FormInput } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { authErrorMessage } from "@/lib/authErrors";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    setLoading(false);

    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Vérifie ta boîte mail">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <MailCheck size={24} className="text-teal" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-ink/70 leading-relaxed">
            Si un compte existe pour <strong className="text-ink">{email}</strong>, un lien de
            réinitialisation vient d&apos;être envoyé. Il est valable une heure.
          </p>
          <Link
            href="/connexion"
            className="press inline-block mt-5 text-sm text-teal underline font-medium"
          >
            Retour à la connexion
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="On t'envoie un lien pour en choisir un nouveau"
    >
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && <p className="text-tag mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50"
        >
          {loading && <Spinner size={16} />}
          {loading ? "Envoi…" : "Envoyer le lien"}
        </button>

        <p className="mt-5 text-sm text-ink/70 text-center">
          <Link href="/connexion" className="text-teal underline font-medium">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
