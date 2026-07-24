import Link from "next/link";
import { CityBadge } from "@/components/CityBadge";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-teal mb-2">
          Point 4 — Villes et localisation
        </p>
        <h1 className="text-4xl font-bold text-ink">
          Le projet tourne 🎉
        </h1>
        <div className="mt-4">
          <CityBadge />
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/inscription" className="text-teal underline">
            S&apos;inscrire
          </Link>
          <Link href="/connexion" className="text-teal underline">
            Se connecter
          </Link>
          <Link href="/compte" className="text-teal underline">
            Mon compte
          </Link>
        </div>
      </div>
    </main>
  );
}
