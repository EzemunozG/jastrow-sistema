import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white py-12 text-center">
      <Icon className="size-8 text-neutral-300" strokeWidth={1.5} />
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-neutral-400">{description}</p>
      )}
      {action}
    </div>
  );
}
