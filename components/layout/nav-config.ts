import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  DollarSign,
  FileText,
  FlaskConical,
  GitCompare,
  LandPlot,
  LayoutDashboard,
  List,
  MapPin,
  Package,
  Sprout,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

export type NavLeaf = { href: string; label: string };
export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string; // link directo si no tiene sub-items
  items?: NavLeaf[]; // grupo expandible
  adminOnly?: boolean;
};

export const NAV: NavItem[] = [
  { label: "Resumen", icon: LayoutDashboard, href: "/resumen" },
  { label: "Tendencia", icon: TrendingUp, href: "/tendencia" },
  {
    label: "Viajes",
    icon: Truck,
    items: [
      { href: "/viajes/listado", label: "Listado" },
      { href: "/viajes/reconciliacion", label: "Reconciliación" },
      { href: "/viajes/libreta", label: "Libreta" },
    ],
  },
  { label: "Rendimiento", icon: Sprout, href: "/rendimiento" },
  {
    label: "Campo",
    icon: MapPin,
    items: [
      { href: "/campo/costos", label: "Costos" },
      { href: "/campo/facturas", label: "Facturas" },
      { href: "/campo/lotes", label: "Lotes" },
    ],
  },
  {
    label: "Stock & Recetas",
    icon: Package,
    items: [
      { href: "/stock/inventario", label: "Inventario" },
      { href: "/stock/recetas", label: "Recetas" },
    ],
  },
  { label: "Alertas", icon: AlertTriangle, href: "/alertas" },
  {
    label: "Administración",
    icon: Users,
    adminOnly: true,
    items: [{ href: "/admin/usuarios", label: "Usuarios" }],
  },
];

// Íconos por sub-item, para las listas expandidas (más chicos, en components que los
// consuman). Mapeo aparte para no forzar un ícono por leaf en NavItem.items.
export const LEAF_ICONS: Record<string, LucideIcon> = {
  "/viajes/listado": List,
  "/viajes/reconciliacion": GitCompare,
  "/viajes/libreta": BookOpen,
  "/campo/costos": DollarSign,
  "/campo/facturas": FileText,
  "/campo/lotes": LandPlot,
  "/stock/inventario": Package,
  "/stock/recetas": FlaskConical,
  "/admin/usuarios": Users,
};
