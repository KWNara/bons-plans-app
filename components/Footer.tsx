import Link from "next/link";
import { LogoLockup } from "@/components/ui/Logo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-contrast text-white/70">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          <Link href="/" className="press flex items-center gap-2 w-fit">
            <LogoLockup size={32} textClassName="text-white text-base" />
          </Link>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2.5">Découvrir</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="press hover:text-white">
                    Fil de bons plans
                  </Link>
                </li>
                <li>
                  <Link href="/tarifs" className="press hover:text-white">
                    Tarifs commerçants
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2.5">Informations légales</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/mentions-legales" className="press hover:text-white">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="/cgu" className="press hover:text-white">
                    CGU &amp; CGV
                  </Link>
                </li>
                <li>
                  <Link href="/confidentialite" className="press hover:text-white">
                    Confidentialité (RGPD)
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-5">
          <p className="text-xs text-white/60">© {year} Déniche. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
