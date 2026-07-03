import { SubTabs } from "@/components/layout/sub-tabs";

const TABS = [
  { href: "/campo/lotes", label: "Lotes" },
  { href: "/campo/facturas", label: "Facturas" },
  { href: "/campo/costos", label: "Costos y Rendimiento" },
];

export default function CampoLayout({
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
