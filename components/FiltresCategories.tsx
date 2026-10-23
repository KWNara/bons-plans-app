import { CategoryIcon } from "@/components/ui/CategoryIcon";

export type Categorie = { id: string; nom: string; icone: string | null };

type Props = {
  categories: Categorie[];
  categorieId: string | null;
  onChange: (id: string | null) => void;
  enEchec?: boolean;
};

/** Puces « Tout » + une par catégorie, à placer dans une rangée défilante. */
export function FiltresCategories({ categories, categorieId, onChange, enEchec }: Props) {
  return (
    <>
      <button
        onClick={() => onChange(null)}
        aria-pressed={categorieId === null}
        className={`press whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          categorieId === null
            ? "bg-contrast text-white border-contrast"
            : "bg-surface text-ink/70 border-ink/10 hover:border-ink/25"
        }`}
      >
        Tout
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          aria-pressed={categorieId === c.id}
          className={`press flex items-center gap-1.5 whitespace-nowrap pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            categorieId === c.id
              ? "bg-contrast text-white border-contrast"
              : "bg-surface text-ink/70 border-ink/10 hover:border-ink/25"
          }`}
        >
          <CategoryIcon
            icone={c.icone}
            size={11}
            className={`w-5 h-5 ${categorieId === c.id ? "!bg-surface/20 [&_svg]:!text-white" : ""}`}
          />
          {c.nom}
        </button>
      ))}
      {/* Une panne réduirait sinon la barre au seul bouton « Tout », ce qui
          fait passer une erreur pour une absence de catégories. */}
      {enEchec && <span className="text-xs text-ink/60 whitespace-nowrap">Filtres indisponibles</span>}
    </>
  );
}
