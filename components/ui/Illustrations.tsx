// Illustrations des états vides.
//
// Elles reprennent le vocabulaire du logo : un trait fin arrondi, une ellipse
// vue en perspective, et une touche de moutarde pour « la trouvaille ». Les
// couleurs passent par les jetons du thème, donc elles basculent seules en
// mode sombre — pas de variante à maintenir.
//
// Un état vide est un moment où l'utilisateur ne trouve rien : une icône
// générique le laisse sur ce constat, un dessin lui donne le ton de l'endroit.

type Props = { className?: string; size?: number };

function Cadre({ children, className = "", size = 96 }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const TRAIT = "stroke-ink/25";
const TRAIT_PALE = "stroke-ink/10";

/** Le panier de Chiner, encore vide. Pour « aucun bon plan ici ». */
export function PanierVide(props: Props) {
  return (
    <Cadre {...props}>
      {/* Un corps qui se resserre vers un fond plat, et non une simple courbe :
          deux essais en bol se lisaient comme une soucoupe volante. Le trapèze
          est ce qui distingue un panier d'une coupe. */}
      <path d="M33 38 Q48 0 63 38" className={TRAIT_PALE} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="48" cy="40" rx="27" ry="8" className={TRAIT} strokeWidth="3" />
      <path
        d="M21 40 L30 76 Q48 82 66 76 L75 40"
        className={TRAIT}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Le tressage, à peine marqué : il donne la matière sans charger. */}
      <path d="M35 46 L39 77" className={TRAIT_PALE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M61 46 L57 77" className={TRAIT_PALE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25 58 Q48 64 71 58" className={TRAIT_PALE} strokeWidth="2.5" strokeLinecap="round" />
      {/* La trouvaille n'est pas encore tombée dedans. */}
      <circle cx="80" cy="20" r="4.5" className="fill-marigold" />
      <path
        d="M74 12 L72 8 M89 15 L93 13 M86 29 L90 31"
        className="stroke-marigold/60"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Cadre>
  );
}

/** Deux silhouettes que rien ne relie encore. Pour « aucun ami ». */
export function AmisAbsents(props: Props) {
  return (
    <Cadre {...props}>
      <circle cx="29" cy="40" r="11" className={TRAIT} strokeWidth="3" />
      {/* Un buste en demi-cercle plutôt qu'une courbe ouverte : les deux arcs
          précédents se lisaient comme deux collines, pas comme des épaules. */}
      <path d="M12 70 a17 14 0 0 1 34 0" className={TRAIT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="67" cy="40" r="11" className={TRAIT_PALE} strokeWidth="3" />
      <path d="M50 70 a17 14 0 0 1 34 0" className={TRAIT_PALE} strokeWidth="3" strokeLinecap="round" />
      {/* Le lien reste à faire : il enjambe les deux têtes, en pointillé. */}
      <path
        d="M22 28 Q48 4 74 28"
        className="stroke-marigold/70"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      <circle cx="48" cy="16" r="4.5" className="fill-marigold" />
    </Cadre>
  );
}

/** Une bulle de discussion restée muette. Pour « aucun message ». */
export function BulleSilencieuse(props: Props) {
  return (
    <Cadre {...props}>
      <rect x="50" y="18" width="30" height="20" rx="9" className={TRAIT_PALE} strokeWidth="3" />
      <path
        d="M18 34 h40 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-22 l-10 9 v-9 h-8 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10 z"
        className={TRAIT}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="51" r="3" className="fill-ink/20" />
      <circle cx="41" cy="51" r="3" className="fill-ink/20" />
      <circle cx="52" cy="51" r="3" className="fill-marigold" />
    </Cadre>
  );
}

/** Une cloche au repos. Pour « aucune notification ». */
export function ClocheAuRepos(props: Props) {
  return (
    <Cadre {...props}>
      <path
        d="M28 64 c0-5 3-7 3-14 a17 17 0 0 1 34 0 c0 7 3 9 3 14 z"
        className={TRAIT}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M41 70 a7 7 0 0 0 14 0" className={TRAIT} strokeWidth="3" strokeLinecap="round" />
      {/* Le bouton était détaché du dôme : cette tige le raccroche. */}
      <path d="M48 28 v5" className={TRAIT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="24" r="4" className="fill-marigold" />
      {/* Elle dort : deux « z » qui s'éloignent valent mieux qu'un seul, qu'on
          lisait comme une lettre posée à côté de la cloche. */}
      <path
        d="M70 20 h9 l-9 11 h9"
        className="stroke-ink/20"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M82 36 h6 l-6 8 h6"
        className="stroke-ink/15"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Cadre>
  );
}

/** Une loupe posée sur du vide. Pour « aucun résultat ». */
export function RechercheVide(props: Props) {
  return (
    <Cadre {...props}>
      <circle cx="42" cy="40" r="22" className={TRAIT} strokeWidth="3" />
      <path d="M58 56 L78 76" className={TRAIT} strokeWidth="4" strokeLinecap="round" />
      <path d="M34 40 h16" className="stroke-marigold" strokeWidth="3" strokeLinecap="round" />
    </Cadre>
  );
}
