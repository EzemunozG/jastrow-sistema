export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createUser, toggleUserDisabled } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function UsuariosAdminPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 text-sm font-medium">Usuarios</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.username}</TableCell>
                <TableCell>
                  <Badge variant={p.role === "admin" ? "default" : "secondary"}>
                    {p.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.disabled ? (
                    <Badge variant="destructive">Deshabilitado</Badge>
                  ) : (
                    <Badge variant="outline">Activo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <form
                    action={toggleUserDisabled.bind(null, p.id, !p.disabled)}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      {p.disabled ? "Habilitar" : "Deshabilitar"}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 text-sm font-medium">Nuevo usuario</h2>
        <form action={createUser} className="grid max-w-md gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña temporal</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue="user">
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="justify-self-start">
            Crear usuario
          </Button>
        </form>
      </div>
    </div>
  );
}
