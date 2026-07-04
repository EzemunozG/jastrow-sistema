import { SubTabs } from "@/components/layout/sub-tabs";

const TABS = [
  { href: "/stock/inventario", label: "Inventario" },
  { href: "/stock/recetas", label: "Recetas" },
];

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SubTabs tabs={TABS} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
