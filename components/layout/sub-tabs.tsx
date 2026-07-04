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
    <div className="flex gap-1 rounded-lg bg-[#F4F3F0] p-1">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm transition-colors",
              active
                ? "bg-white font-medium text-[#0F4C2B] shadow-sm"
                : "text-neutral-500 hover:text-neutral-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
