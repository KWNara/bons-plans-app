import type { LucideIcon } from "lucide-react";
import { PackageSearch } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon = PackageSearch, title, description, action }: Props) {
  return (
    <div className="col-span-full flex flex-col items-center text-center py-14 px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mb-4">
        <Icon size={28} className="text-teal" strokeWidth={1.75} />
      </div>
      <p className="font-semibold text-ink mb-1">{title}</p>
      {description && <p className="text-sm text-ink/60 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
