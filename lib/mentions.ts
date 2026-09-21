/**
 * Mentions « @pseudo » dans les commentaires.
 *
 * Le pseudo n'est contraint par aucune règle à l'inscription : il peut contenir
 * des accents, des tirets, des points. On accepte donc un jeu large de
 * caractères de mot, et c'est la base qui tranche — un pseudo qui ne
 * correspond à personne s'affiche en texte brut, sans lien mort.
 */

// `\p{L}` couvre les lettres accentuées, que `\w` laisserait tomber : « @Léa »
// aurait été coupé à « @L ». Le jeu de caractères s'arrête avant la ponctuation
// de phrase, donc « salut @lea ! » ne mentionne pas « lea! ».
//
// Le groupe de tête impose que l'arobase ouvre un mot : sans lui,
// « contact@exemple.fr » était lu comme une mention de « exemple.fr ». Il est
// capturé plutôt qu'écrit en arrière-vérification, que Safari n'a su lire
// qu'à partir de la version 16.4.
// Le pseudo doit aussi SE TERMINER par un caractère alphanumérique : sans ce
// dernier groupe, « Merci @lea. » extrayait « lea. », qui ne correspond à
// personne — ni lien, ni notification, et pas la moindre erreur pour le dire.
// Les points internes restent intacts, « jean.dupont » est toujours citable.
const MOTIF_MENTION = /(^|[\s(])@([\p{L}\p{N}][\p{L}\p{N}_.-]{0,28}[\p{L}\p{N}])/gu;

export type Segment =
  | { type: "texte"; valeur: string }
  | { type: "mention"; pseudo: string };

/** Les pseudos mentionnés, dédoublonnés, dans leur casse d'origine. */
export function extraireMentions(texte: string): string[] {
  const vus = new Set<string>();
  const sortie: string[] = [];

  for (const correspondance of texte.matchAll(MOTIF_MENTION)) {
    const pseudo = correspondance[2];
    const cle = pseudo.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    sortie.push(pseudo);
  }

  return sortie;
}

/**
 * Découpe un commentaire en segments pour l'affichage.
 *
 * Le texte est conservé tel quel : on ne réécrit rien, on se contente de
 * marquer les passages à rendre en lien. C'est ce qui permet d'afficher une
 * mention inconnue comme du texte ordinaire plus tard, sans perdre le « @ ».
 */
export function decouperMentions(texte: string): Segment[] {
  const segments: Segment[] = [];
  let curseur = 0;

  for (const correspondance of texte.matchAll(MOTIF_MENTION)) {
    // La correspondance englobe le caractère de frontière : la mention
    // commence après lui, et ce caractère appartient au segment de texte.
    const debut = (correspondance.index ?? 0) + correspondance[1].length;

    if (debut > curseur) {
      segments.push({ type: "texte", valeur: texte.slice(curseur, debut) });
    }

    segments.push({ type: "mention", pseudo: correspondance[2] });
    curseur = debut + 1 + correspondance[2].length;
  }

  if (curseur < texte.length) {
    segments.push({ type: "texte", valeur: texte.slice(curseur) });
  }

  return segments;
}

/**
 * Le fragment en cours de saisie après un « @ », si le curseur en suit un.
 *
 * Renvoie `null` dès qu'un espace sépare le curseur du « @ » : sans ça,
 * l'autocomplétion restait ouverte pendant toute la rédaction de la phrase.
 */
export function fragmentEnCours(texte: string, position: number): string | null {
  const avant = texte.slice(0, position);
  const arobase = avant.lastIndexOf("@");

  if (arobase === -1) return null;

  // Un « @ » collé à un mot (une adresse e-mail, par exemple) n'ouvre pas une
  // mention.
  const precedent = arobase > 0 ? avant[arobase - 1] : " ";
  if (!/[\s(]/.test(precedent)) return null;

  const fragment = avant.slice(arobase + 1);
  if (/[\s@]/.test(fragment)) return null;
  if (fragment.length > 30) return null;

  return fragment;
}

/** Remplace le fragment en cours par le pseudo choisi, et rend la position du curseur. */
export function appliquerMention(
  texte: string,
  position: number,
  pseudo: string
): { texte: string; curseur: number } {
  const fragment = fragmentEnCours(texte, position);
  if (fragment === null) return { texte, curseur: position };

  const debut = position - fragment.length - 1;
  const insertion = `@${pseudo} `;

  return {
    texte: texte.slice(0, debut) + insertion + texte.slice(position),
    curseur: debut + insertion.length,
  };
}
