// Le symbole de Chiner : un nid (trois brins entrelacés) avec la trouvaille au
// centre. Il n'a pas eu besoin de changer avec le nom — fouiller un panier
// pour en sortir la bonne pièce, c'est exactement ce que « chiner » désigne.
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-teal shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 56 56" fill="none">
        <path
          d="M12 28 Q 28 48 44 28"
          stroke="#F5EFDD"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="28" cy="28" rx="17" ry="5.5" stroke="#F5EFDD" strokeWidth="3.2" fill="none" />
        <circle cx="28" cy="25" r="5.5" fill="#E8B94E" />
      </svg>
    </span>
  );
}

export function LogoLockup({
  size = 36,
  textClassName = "text-ink text-lg",
}: {
  size?: number;
  textClassName?: string;
}) {
  return (
    <>
      <LogoMark size={size} />
      <span className={`font-extrabold tracking-tight ${textClassName}`}>Chiner</span>
    </>
  );
}
