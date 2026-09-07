import Link from "next/link";
import { Tag } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper">
      <div className="w-full max-w-sm">
        <Link href="/" className="press flex items-center justify-center gap-2 mb-8 w-fit mx-auto">
          <span className="w-9 h-9 rounded-full bg-teal flex items-center justify-center">
            <Tag size={17} className="text-white" strokeWidth={2.25} />
          </span>
          <span className="font-extrabold text-ink text-lg tracking-tight">Bons Plans</span>
        </Link>

        <div className="bg-white rounded-card shadow-soft border border-ink/10 p-6 animate-fade-in">
          <h1 className="text-xl font-extrabold text-ink mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-ink/50 mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-4" />}
          {children}
        </div>
      </div>
    </main>
  );
}
