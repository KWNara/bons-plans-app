export type EtatParticipation = {
  /** Pseudos des amis qui y vont, dans l'ordre d'affichage. */
  amis: string[];
  /** Total réel, toutes personnes confondues — y compris les inconnus. */
  total: number;
  /** Est-ce que l'utilisateur courant a déclaré y aller ? */
  jyVais: boolean;
};

const CITES_MAX = 2;

/**
 * Compose la phrase affichée sous « Qui y va ? ».
 *
 * La règle qui gouverne tout : on ne nomme que des amis, jamais un inconnu.
 * Les inconnus — et les amis au-delà des deux premiers — sont agrégés dans un
 * « et N autres ». C'est ce qui permet d'afficher un total encourageant sans
 * révéler qui que ce soit à quelqu'un qui n'a pas été accepté en ami.
 */
export function phraseParticipation({ amis, total, jyVais }: EtatParticipation): string {
  if (total <= 0) return "Personne n'a encore dit y aller.";

  const cites = amis.slice(0, CITES_MAX);

  if (cites.length === 0) {
    if (jyVais && total === 1) return "Tu y vas. Dis-le à tes amis !";
    return `${total} ${total > 1 ? "personnes y vont" : "personne y va"}.`;
  }

  // Les personnes non nommées : le total, moins les pseudos cités, moins
  // soi-même si on est du nombre.
  const anonymes = Math.max(0, total - cites.length - (jyVais ? 1 : 0));

  // Un pseudo cité plus au moins un anonyme : toujours au moins deux personnes,
  // donc toujours « y vont ».
  if (anonymes > 0) {
    return `${cites.join(", ")} et ${anonymes} ${anonymes > 1 ? "autres" : "autre"} y vont.`;
  }

  return `${cites.join(" et ")} y ${cites.length > 1 ? "vont" : "va"}.`;
}
