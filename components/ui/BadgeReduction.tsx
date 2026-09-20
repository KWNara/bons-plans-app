// Le badge de réduction, dessiné comme un tampon encreur.
//
// L'ancienne version était un drapeau plein qui s'appuyait sur le bord de la
// photo : lisible, mais interchangeable avec n'importe quelle application de
// promotions. Un tampon posé de travers, à l'encre rouge sur fond papier,
// raconte quelque chose de plus juste pour Déniche — la trouvaille estampillée.
//
// Le double filet (bordure + anneau intérieur) est ce qui fait lire « tampon »
// plutôt que « cadre » ; l'inclinaison légère fait le reste.

type Props = {
  children: React.ReactNode;
  taille?: "carte" | "detail";
  className?: string;
};

const TAILLES = {
  carte: "text-sm px-2.5 py-1 border-2",
  detail: "text-base px-3.5 py-1.5 border-[3px]",
} as const;

export function BadgeReduction({ children, taille = "carte", className = "" }: Props) {
  return (
    <span
      // Le fond garde une part de transparence pour laisser deviner la photo
      // dessous, comme une encre posée sur le papier plutôt qu'une étiquette
      // collée par-dessus.
      className={`inline-block select-none -rotate-[7deg] rounded-[5px] bg-paper/85 backdrop-blur-[1px] border-tag text-tag font-extrabold uppercase tracking-[0.06em] leading-none ring-1 ring-inset ring-tag/40 shadow-soft ${TAILLES[taille]} ${className}`}
    >
      {children}
    </span>
  );
}
