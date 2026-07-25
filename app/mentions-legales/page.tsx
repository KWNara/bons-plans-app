import { Scale } from "lucide-react";
import { LegalShell, Fill } from "@/components/ui/LegalContent";

export const metadata = {
  title: "Mentions légales — Bons Plans",
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell
      icon={Scale}
      title="Mentions légales"
      intro="Ceci est un template de départ, pas un document validé juridiquement. Les emplacements entre crochets [ ] sont à remplir dès que le statut (micro-entreprise ou société) est créé. Une relecture par un professionnel avant mise en ligne est recommandée."
    >
      <h3>Éditeur du site</h3>
      <p>
        Le site <Fill>[NOM DE L&apos;APPLICATION]</Fill> est édité par :
      </p>
      <ul>
        <li>
          <Fill>[NOM / RAISON SOCIALE]</Fill>, <Fill>[micro-entrepreneur / SASU / autre statut]</Fill>
        </li>
        <li>
          Adresse : <Fill>[ADRESSE COMPLÈTE]</Fill>
        </li>
        <li>
          SIRET : <Fill>[NUMÉRO SIRET]</Fill>
        </li>
        <li>
          Email de contact : <Fill>[EMAIL]</Fill>
        </li>
        <li>
          Directeur de la publication : <Fill>[NOM DU RESPONSABLE]</Fill>
        </li>
      </ul>

      <h3>Hébergement</h3>
      <ul>
        <li>
          Hébergement du site web : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis —{" "}
          <a href="https://vercel.com" className="text-teal underline" target="_blank" rel="noreferrer">
            https://vercel.com
          </a>
        </li>
        <li>
          Hébergement de la base de données : Supabase Inc. —{" "}
          <a href="https://supabase.com" className="text-teal underline" target="_blank" rel="noreferrer">
            https://supabase.com
          </a>
        </li>
        <li>
          <Fill>[Si Resend est utilisé pour les emails, ajouter : Envoi d&apos;emails transactionnels : Resend, Inc.]</Fill>
        </li>
      </ul>

      <h3>Propriété intellectuelle</h3>
      <p>
        L&apos;ensemble des éléments du site (textes, logo, charte graphique, code) est la propriété de{" "}
        <Fill>[NOM DE L&apos;APPLICATION / RAISON SOCIALE]</Fill>, sauf mention contraire. Toute reproduction
        sans autorisation est interdite.
      </p>

      <h3>Litiges</h3>
      <p>
        En cas de litige, une solution amiable sera recherchée avant toute action judiciaire. À défaut, les
        tribunaux de <Fill>[VILLE, ex: Besançon]</Fill> seront seuls compétents.
      </p>
    </LegalShell>
  );
}
