"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, LEAF_ICONS, type NavItem } from "@/components/layout/nav-config";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const COLLAPSE_KEY = "jastrow:sidebar-collapsed";

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href) return pathname.startsWith(item.href);
  return (item.items ?? []).some((leaf) => pathname.startsWith(leaf.href));
}

function NavGroup({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const active = isItemActive(item, pathname);
  // Se abre solo cuando la página activa entra al grupo (nunca se cierra sola al
  // salir, para no colapsar un grupo que el usuario dejó abierto a mano). Ajuste de
  // estado durante el render en vez de un efecto — ver filter-bar.tsx.
  const [prevActive, setPrevActive] = useState(active);
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setOpenOverride(true);
  }
  const open = openOverride ?? active;

  const Icon = item.icon;

  if (item.href) {
    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "bg-[#0F4C2B]/10 font-medium text-[#0F4C2B]"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  const items = item.items ?? [];
  if (collapsed) {
    // Sin espacio para desplegar sub-items: el ícono lleva directo al primero.
    return (
      <Link
        href={items[0]?.href ?? "#"}
        title={item.label}
        className={cn(
          "flex items-center justify-center rounded-lg px-0 py-2 text-sm transition-colors",
          active
            ? "bg-[#0F4C2B]/10 text-[#0F4C2B]"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        )}
      >
        <Icon className="size-4 shrink-0" />
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenOverride(!open)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          active
            ? "font-medium text-[#0F4C2B]"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-0.5 ml-[1.15rem] space-y-0.5 border-l pl-3.5">
          {items.map((leaf) => {
            const LeafIcon = LEAF_ICONS[leaf.href];
            const leafActive = pathname.startsWith(leaf.href);
            return (
              <Link
                key={leaf.href}
                href={leaf.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  leafActive
                    ? "bg-[#0F4C2B]/10 font-medium text-[#0F4C2B]"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
                )}
              >
                {LeafIcon && <LeafIcon className="size-3.5 shrink-0" />}
                {leaf.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavList({
  pathname,
  collapsed,
  isAdmin,
}: {
  pathname: string;
  collapsed: boolean;
  isAdmin: boolean;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <NavGroup
          key={item.label}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // localStorage no existe en el server — leerlo durante el render rompería la
  // hidratación (el primer paint del cliente tiene que matchear el HTML del server).
  // Se lee acá, una sola vez montado, y se acepta el re-render extra.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-white transition-[width] duration-150 md:flex",
        collapsed ? "w-14" : "w-56",
        !hydrated && "invisible", // evita el flash colapsado→expandido en el primer paint
      )}
    >
      <div className="flex-1 overflow-y-auto p-2.5">
        <NavList pathname={pathname} collapsed={collapsed} isAdmin={isAdmin} />
      </div>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center justify-center gap-2 border-t p-2.5 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <>
            <PanelLeftClose className="size-4" /> Contraer
          </>
        )}
      </button>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Cierra el drawer al navegar — ajuste de estado durante el render en vez de un
  // efecto, ver filter-bar.tsx.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú"
          className="flex size-8 items-center justify-center rounded-md border border-white/25 bg-white/10 md:hidden"
        >
          <Menu className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>JASTROW</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <NavList pathname={pathname} collapsed={false} isAdmin={isAdmin} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
