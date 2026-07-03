import Link from "next/link";
import { IconLogout, IconPlant, IconUsers } from "@tabler/icons-react";
import { logout } from "@/actions/auth";

export function Topbar({
  username,
  isAdmin,
}: {
  username: string;
  isAdmin: boolean;
}) {
  return (
    <header className="flex h-13 items-center justify-between bg-[#0F4C2B] px-6 text-white">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-wide">
          <IconPlant size={15} /> JASTROW
        </div>
        <div className="hidden text-[11px] opacity-65 sm:block">
          Sistema de Rendimientos · Zafra 2026
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-sm">
        <span className="hidden opacity-80 sm:inline">{username}</span>
        {isAdmin && (
          <Link
            href="/admin/usuarios"
            className="flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
          >
            <IconUsers size={13} /> Usuarios
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
          >
            <IconLogout size={13} /> Salir
          </button>
        </form>
      </div>
    </header>
  );
}
