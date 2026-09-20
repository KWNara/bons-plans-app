import Link from "next/link";
import { decouperMentions } from "@/lib/mentions";

type Props = {
  texte: string;
  /** Pseudo en minuscules → identifiant du profil. */
  profils: Map<string, string>;
  className?: string;
};

/**
 * Affiche un commentaire en transformant les « @pseudo » connus en liens.
 *
 * Un pseudo qu'on n'a pas su résoudre reste du texte ordinaire : mieux vaut un
 * « @machin » inerte qu'un lien qui mène à une page introuvable.
 */
export function TexteAvecMentions({ texte, profils, className = "" }: Props) {
  return (
    <p className={className}>
      {decouperMentions(texte).map((segment, i) => {
        if (segment.type === "texte") return <span key={i}>{segment.valeur}</span>;

        const id = profils.get(segment.pseudo.toLowerCase());

        if (!id) return <span key={i}>@{segment.pseudo}</span>;

        return (
          <Link
            key={i}
            href={`/profil/${id}`}
            className="press font-semibold text-teal hover:underline"
          >
            @{segment.pseudo}
          </Link>
        );
      })}
    </p>
  );
}
