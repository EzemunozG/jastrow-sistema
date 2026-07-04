import { SubTabs } from "@/components/layout/sub-tabs";

const TABS = [
  { href: "/viajes/listado", label: "INFRARUT Ingenio" },
  { href: "/viajes/libreta", label: "Libreta del Campo" },
  { href: "/viajes/reconciliacion", label: "Reconciliación" },
];

export default function ViajesLayout({
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
