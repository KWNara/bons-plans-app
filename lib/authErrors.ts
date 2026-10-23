// Supabase renvoie ses erreurs d'authentification en anglais et dans un
// vocabulaire technique (« Invalid login credentials »). Les afficher telles
// quelles, sur un site entièrement en français, donne l'impression d'un bug.

// `codes` : les codes d'erreur stables de Supabase Auth, consultés en premier.
// Le texte anglais, lui, change d'une version à l'autre sans prévenir :
// « Unable to validate email address » est devenu « Email address "…" is
// invalid », et le refus d'une adresse s'affichait en erreur générique.
const MESSAGES: { codes?: string[]; match: RegExp; message: string }[] = [
  {
    codes: ["invalid_credentials"],
    match: /invalid login credentials/i,
    message: "Email ou mot de passe incorrect.",
  },
  {
    codes: ["email_not_confirmed"],
    match: /email not confirmed/i,
    message: "Ton adresse email n'est pas encore confirmée. Vérifie ta boîte mail.",
  },
  {
    codes: ["user_already_exists", "email_exists"],
    match: /user already registered|already been registered/i,
    message: "Un compte existe déjà avec cette adresse email.",
  },
  {
    match: /password should be at least/i,
    message: "Le mot de passe doit contenir au moins 6 caractères.",
  },
  {
    codes: ["email_address_invalid"],
    match: /unable to validate email address|invalid format|email address .+ is invalid/i,
    message: "Cette adresse email n'est pas valide.",
  },
  {
    codes: ["over_email_send_rate_limit", "over_request_rate_limit"],
    match: /email rate limit exceeded|over_email_send_rate_limit/i,
    message: "Trop de tentatives. Patiente quelques minutes avant de réessayer.",
  },
  {
    match: /for security purposes.*after (\d+) seconds/i,
    message: "Trop de tentatives rapprochées. Patiente une minute avant de réessayer.",
  },
  {
    codes: ["otp_expired"],
    match: /token has expired|invalid or has expired/i,
    message: "Ce lien a expiré. Demandes-en un nouveau.",
  },
  {
    codes: ["same_password"],
    match: /new password should be different/i,
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
  },
  {
    codes: ["user_not_found"],
    match: /user not found/i,
    message: "Aucun compte ne correspond à cette adresse email.",
  },
  {
    codes: ["provider_disabled"],
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
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : null;

  const known =
    (code && MESSAGES.find((entry) => entry.codes?.includes(code))) ||
    MESSAGES.find((entry) => entry.match.test(raw));
  if (known) return known.message;

  return "Une erreur est survenue. Réessaie dans un instant.";
}
