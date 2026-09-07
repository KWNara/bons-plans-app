import Link from "next/link";
import { ChevronLeft, AlertTriangle, type LucideIcon } from "lucide-react";

export function Fill({ children }: { children: string }) {
  return (
    <span className="inline-block bg-marigold/20 text-ink font-semibold rounded px-1 py-0.5">
      {children}
    </span>
  );
}

export function LegalShell({
  icon: Icon,
  title,
  intro,
  children,
}: {
  icon: LucideIcon;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-9 h-9 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-teal" strokeWidth={1.75} />
          </span>
          <h1 className="text-xl font-extrabold text-ink">{title}</h1>
        </div>

        <div className="flex items-start gap-2.5 bg-marigold/10 border border-marigold/30 rounded-control px-4 py-3 mb-5">
          <AlertTriangle size={16} className="text-marigold shrink-0 mt-0.5" />
          <p className="text-xs text-ink/70 leading-relaxed">{intro}</p>
        </div>

        <div className="bg-white rounded-card shadow-soft border border-ink/10 p-5 sm:p-7">
          <div className="legal-content">{children}</div>
        </div>
      </div>
    </main>
  );
}
