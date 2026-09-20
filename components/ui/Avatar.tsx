import Image from "next/image";

type Props = {
  pseudo: string | null | undefined;
  url: string | null | undefined;
  size?: number;
  className?: string;
};

// Les avatars sont téléversés sans contrainte de dimensions : affichés bruts,
// une photo de plusieurs mégaoctets était téléchargée entière pour un cercle
// de 40 pixels. next/image la redimensionne côté serveur.
export function Avatar({ pseudo, url, size = 40, className = "" }: Props) {
  const initiale = pseudo?.trim()?.[0]?.toUpperCase() ?? "?";

  if (!url) {
    return (
      <span
        aria-hidden="true"
        className={`rounded-full bg-teal/10 text-teal font-semibold flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      >
        {initiale}
      </span>
    );
  }

  return (
    <Image
      src={url}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
