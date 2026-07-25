import { ShieldCheck } from "lucide-react";
import { LegalShell, Fill } from "@/components/ui/LegalContent";

export const metadata = {
  title: "Politique de confidentialité — Bons Plans",
};

export default function ConfidentialitePage() {
  return (
    <LegalShell
      icon={ShieldCheck}
      title="Politique de confidentialité (RGPD)"
      intro="Ceci est un template de départ, pas un document validé juridiquement. Les emplacements entre crochets [ ] sont à remplir dès que le statut (micro-entreprise ou société) est créé. Une relecture par un professionnel avant mise en ligne est recommandée, en particulier pour la partie RGPD."
    >
      <h3>Données collectées</h3>
      <div className="legal-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Donnée</th>
              <th>Utilisateur particulier</th>
              <th>Commerçant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Email</td>
              <td>Oui</td>
              <td>Oui</td>
            </tr>
            <tr>
              <td>Mot de passe (haché)</td>
              <td>Oui</td>
              <td>Oui</td>
            </tr>
            <tr>
              <td>Pseudo / nom</td>
              <td>Oui</td>
              <td>Oui (nom d&apos;enseigne)</td>
            </tr>
            <tr>
              <td>Ville(s) suivie(s)</td>
              <td>Oui</td>
              <td>Oui (villes de diffusion)</td>
            </tr>
            <tr>
              <td>Géolocalisation (si autorisée)</td>
              <td>Optionnel</td>
              <td>Optionnel</td>
            </tr>
            <tr>
              <td>SIRET</td>
              <td>—</td>
              <td>Oui</td>
            </tr>
            <tr>
              <td>Données de paiement</td>
              <td>—</td>
              <td>Gérées uniquement par Stripe, jamais stockées par nous</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Finalité du traitement</h3>
      <p>
        Ces données sont utilisées pour : créer et gérer le compte, afficher le fil de bons plans localisé,
        permettre les interactions sociales (like, commentaire, partage), envoyer des notifications d&apos;alertes
        personnalisées, et pour les commerçants, vérifier l&apos;authenticité de l&apos;activité (SIRET) et gérer
        l&apos;abonnement.
      </p>

      <h3>Base légale</h3>
      <ul>
        <li>Exécution du contrat (utilisation du service)</li>
        <li>Consentement (géolocalisation, notifications par email)</li>
        <li>Intérêt légitime (lutte anti-arnaque, modération)</li>
      </ul>

      <h3>Durée de conservation</h3>
      <p>
        Les données sont conservées pendant toute la durée d&apos;utilisation du compte, puis supprimées dans un
        délai de <Fill>[ex: 12 mois]</Fill> après suppression du compte, sauf obligation légale de conservation
        plus longue.
      </p>

      <h3>Destinataires des données</h3>
      <ul>
        <li>
          <Fill>[NOM DE L&apos;APPLICATION]</Fill> (accès interne limité aux besoins de modération/support)
        </li>
        <li>
          Supabase (hébergement base de données, Union Européenne ou clause de transfert adaptée — à vérifier
          selon la région du projet Supabase choisie)
        </li>
        <li>Stripe (paiement, commerçants uniquement)</li>
        <li>Resend ou équivalent (envoi d&apos;emails transactionnels et d&apos;alertes)</li>
      </ul>

      <h3>Droits des utilisateurs</h3>
      <p>
        Conformément au RGPD, chaque utilisateur dispose d&apos;un droit d&apos;accès, de rectification, de
        suppression, de portabilité et d&apos;opposition sur ses données. Ces demandes peuvent être adressées à{" "}
        <Fill>[EMAIL DE CONTACT DPO/RESPONSABLE]</Fill>.
      </p>

      <h3>Cookies</h3>
      <p>
        <Fill>
          [À compléter selon ce qui est réellement utilisé : cookies de session pour l&apos;authentification,
          éventuellement cookies analytics (ex: Vercel Analytics). Prévoir un bandeau de consentement si des
          cookies non essentiels sont utilisés.]
        </Fill>
      </p>

      <h3>Sécurité</h3>
      <p>
        Les mots de passe sont hachés (jamais stockés en clair). Les échanges sont chiffrés (HTTPS). L&apos;accès
        aux données est limité aux personnes habilitées.
      </p>
    </LegalShell>
  );
}
