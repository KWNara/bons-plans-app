import {
  Shirt,
  Utensils,
  Sparkles,
  Home,
  Cpu,
  Gamepad2,
  Wrench,
  Ellipsis,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  utensils: Utensils,
  sparkles: Sparkles,
  home: Home,
  cpu: Cpu,
  "gamepad-2": Gamepad2,
  wrench: Wrench,
  ellipsis: Ellipsis,
};

const TINTS = [
  { bg: "bg-teal/10", text: "text-teal" },
  { bg: "bg-tag/10", text: "text-tag" },
  { bg: "bg-marigold/20", text: "text-marigold" },
  { bg: "bg-ink/10", text: "text-ink" },
];

function tintFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

type Props = {
  icone: string | null | undefined;
  size?: number;
  className?: string;
};

export function CategoryIcon({ icone, size = 18, className = "" }: Props) {
  const Icon = (icone && ICONS[icone]) || Ellipsis;
  const tint = tintFor(icone ?? "autre");

  return (
    <span className={`inline-flex items-center justify-center rounded-full ${tint.bg} ${className}`}>
      <Icon size={size} className={tint.text} strokeWidth={2} />
    </span>
  );
}
