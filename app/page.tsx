export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-teal mb-2">
          Point 1 — Socle technique
        </p>
        <h1 className="text-4xl font-bold text-ink">
          Le projet tourne 🎉
        </h1>
        <p className="mt-3 text-ink/70">
          Prochaine étape : connecter Supabase (Point 2 — modèle de données).
        </p>
      </div>
    </main>
  );
}
