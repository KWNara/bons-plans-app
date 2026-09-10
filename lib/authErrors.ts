// Supabase renvoie ses erreurs d'authentification en anglais et dans un
// vocabulaire technique (« Invalid login credentials »). Les afficher telles
// quelles, sur un site entièrement en français, donne l'impression d'un bug.

const MESSAGES: { match: RegExp; message: string }[] = [
  {
    match: /invalid login credentials/i,
    message: "Email ou mot de passe incorrect.",
  },
  {
    match: /email not confirmed/i,
    message: "Ton adresse email n'est pas encore confirmée. Vérifie ta boîte mail.",
  },
  {
    match: /user already registered|already been registered/i,
    message: "Un compte existe déjà avec cette adresse email.",
  },
  {
    match: /password should be at least/i,
    message: "Le mot de passe doit contenir au moins 6 caractères.",
  },
  {
    match: /unable to validate email address|invalid format/i,
    message: "Cette adresse email n'est pas valide.",
  },
  {
    match: /email rate limit exceeded|over_email_send_rate_limit/i,
    message: "Trop de tentatives. Patiente quelques minutes avant de réessayer.",
  },
  {
    match: /for security purposes.*after (\d+) seconds/i,
    message: "Trop de tentatives rapprochées. Patiente une minute avant de réessayer.",
  },
  {
    match: /token has expired|invalid or has expired/i,
    message: "Ce lien a expiré. Demandes-en un nouveau.",
  },
  {
    match: /new password should be different/i,
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
  },
  {
    match: /user not found/i,
    message: "Aucun compte ne correspond à cette adresse email.",
  },
  {
    match: /provider is not enabled|unsupported provider/i,
    message: "Ce mode de connexion n'est pas disponible pour le moment.",
  },
  {
    match: /failed to fetch|network/i,
    message: "Connexion au serveur impossible. Vérifie ta connexion internet.",
  },
];

export function authErrorMessage(error: unknown): string {
  const raw =
    typeof error === "string" ? error : error instanceof Error ? error.message : "";

  const known = MESSAGES.find((entry) => entry.match.test(raw));
  if (known) return known.message;

  return "Une erreur est survenue. Réessaie dans un instant.";
}
