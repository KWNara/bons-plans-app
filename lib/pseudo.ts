/**
 * Règles du pseudo.
 *
 * Rien ne les imposait : ni le formulaire d'inscription, ni la colonne. Un
 * pseudo contenant une espace passait donc, et devenait incitable — le motif
 * des mentions s'arrête au premier caractère hors jeu, si bien que « @Jean
 * Dupont » ne désignait plus que « Jean ». Le règle est donc alignée sur ce que
 * les mentions savent relire, et vérifiée aux deux bouts.
 */

export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 30;

// Même jeu de caractères que lib/mentions.ts : commence et se termine par un
// caractère alphanumérique, points, tirets et soulignés autorisés au milieu.
const MOTIF_PSEUDO = /^[\p{L}\p{N}][\p{L}\p{N}_.-]{0,28}[\p{L}\p{N}]$/u;

/** Message d'erreur si le pseudo est refusé, `null` s'il convient. */
export function erreurPseudo(pseudo: string): string | null {
  const propre = pseudo.trim();

  if (propre.length < PSEUDO_MIN) {
    return `Ton pseudo doit faire au moins ${PSEUDO_MIN} caractères.`;
  }

  if (propre.length > PSEUDO_MAX) {
    return `Ton pseudo ne doit pas dépasser ${PSEUDO_MAX} caractères.`;
  }

  if (/\s/.test(propre)) {
    return "Ton pseudo ne peut pas contenir d'espace : tes amis ne pourraient pas te citer avec @.";
  }

  if (!MOTIF_PSEUDO.test(propre)) {
    return "Ton pseudo peut contenir des lettres, des chiffres, des points, des tirets et des soulignés, et doit commencer et finir par une lettre ou un chiffre.";
  }

  return null;
}
