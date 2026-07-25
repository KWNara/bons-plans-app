import { FileText } from "lucide-react";
import { LegalShell, Fill } from "@/components/ui/LegalContent";

export const metadata = {
  title: "CGU & CGV — Bons Plans",
};

export default function CguPage() {
  return (
    <LegalShell
      icon={FileText}
      title="Conditions générales d'utilisation et de vente"
      intro="Ceci est un template de départ, pas un document validé juridiquement. Les emplacements entre crochets [ ] sont à remplir dès que le statut (micro-entreprise ou société) est créé. Une relecture par un professionnel avant mise en ligne est recommandée, en particulier pour la partie abonnement payant."
    >
      <h3>Article 1 — Objet</h3>
      <p>
        Les présentes CGU/CGV ont pour objet de définir les modalités d&apos;accès et d&apos;utilisation de la
        plateforme <Fill>[NOM DE L&apos;APPLICATION]</Fill>, mettant en relation des commerçants locaux et des
        utilisateurs autour de bons plans et offres commerciales.
      </p>

      <h3>Article 2 — Accès au service</h3>
      <ul>
        <li>L&apos;inscription est gratuite pour les utilisateurs (particuliers).</li>
        <li>L&apos;inscription commerçant nécessite un numéro SIRET valide, vérifié automatiquement lors de l&apos;inscription.</li>
        <li>
          <Fill>[NOM DE L&apos;APPLICATION]</Fill> se réserve le droit de refuser ou suspendre tout compte ne
          respectant pas les présentes conditions.
        </li>
      </ul>

      <h3>Article 3 — Contenu publié par les commerçants</h3>
      <ul>
        <li>Le commerçant est seul responsable de l&apos;exactitude des informations publiées (prix, disponibilité, durée de validité de l&apos;offre).</li>
        <li>Les annonces trompeuses, frauduleuses, ou ne correspondant pas à une offre réelle sont interdites et peuvent entraîner la suspension du compte.</li>
        <li>
          <Fill>[NOM DE L&apos;APPLICATION]</Fill> exerce une modération a posteriori : les contenus signalés
          sont examinés et peuvent être retirés sans préavis.
        </li>
      </ul>

      <h3>Article 4 — Interactions des utilisateurs</h3>
      <ul>
        <li>Les commentaires doivent respecter un cadre de courtoisie ; tout contenu injurieux, diffamatoire ou illicite peut être supprimé.</li>
        <li>Chaque utilisateur est responsable des contenus qu&apos;il publie (commentaires, partages).</li>
      </ul>

      <h3>Article 5 — Offre payante commerçant</h3>
      <ul>
        <li>Formule gratuite : jusqu&apos;à 3 bons plans actifs simultanément.</li>
        <li>Formule payante « Pro » : 14,90 € TTC/mois, sans engagement, résiliable à tout moment, bons plans illimités.</li>
        <li>
          Le paiement est géré par Stripe. <Fill>[NOM DE L&apos;APPLICATION]</Fill> ne stocke aucune donnée
          bancaire.
        </li>
        <li>L&apos;abonnement se renouvelle automatiquement chaque mois sauf résiliation avant la date de renouvellement.</li>
        <li>
          <Fill>
            [Préciser ici la politique de remboursement — ex: pas de remboursement au prorata en cas de
            résiliation en cours de mois, ou l&apos;inverse, selon ce qui est décidé.]
          </Fill>
        </li>
      </ul>

      <h3>Article 6 — Responsabilité</h3>
      <p>
        <Fill>[NOM DE L&apos;APPLICATION]</Fill> agit en tant qu&apos;intermédiaire technique et n&apos;est pas
        partie aux transactions éventuelles entre commerçants et utilisateurs. La plateforme ne garantit pas la
        disponibilité effective des offres publiées par les commerçants.
      </p>

      <h3>Article 7 — Résiliation</h3>
      <ul>
        <li>L&apos;utilisateur peut supprimer son compte à tout moment depuis son espace personnel.</li>
        <li>Le commerçant peut résilier son abonnement payant depuis le portail client Stripe accessible dans son espace.</li>
      </ul>

      <h3>Article 8 — Modification des CGU/CGV</h3>
      <p>
        <Fill>[NOM DE L&apos;APPLICATION]</Fill> se réserve le droit de modifier les présentes conditions. Les
        utilisateurs seront informés par email en cas de modification substantielle.
      </p>
    </LegalShell>
  );
}
