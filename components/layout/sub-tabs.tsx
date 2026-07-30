"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SubTabs({
  tabs,
}: {
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-lg bg-background p-1">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm transition-colors",
              active
                ? "bg-card font-medium text-brand shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
