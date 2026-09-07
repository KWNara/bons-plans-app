import { AlertTriangle } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Un problème est survenu",
  description = "Vérifie ta connexion et réessaie.",
  onRetry,
}: Props) {
  return (
    <div className="col-span-full flex flex-col items-center text-center py-14 px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-tag/10 flex items-center justify-center mb-4">
        <AlertTriangle size={26} className="text-tag" strokeWidth={1.75} />
      </div>
      <p className="font-semibold text-ink mb-1">{title}</p>
      <p className="text-sm text-ink/60 max-w-xs">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="press mt-4 rounded-control border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink/30"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
