import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Page introuvable — Bons Plans",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <EmptyState
        icon={Compass}
        title="Cette page n'existe pas"
        description="Le lien est peut-être erroné, ou la page a été déplacée."
        action={
          <Link
            href="/"
            className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
          >
            Retour au fil
          </Link>
        }
      />
    </main>
  );
}
