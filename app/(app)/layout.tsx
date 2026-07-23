import { getCurrentProfile } from "@/lib/dal";
import { Topbar } from "@/components/layout/topbar";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getCurrentProfile();
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F3F0]">
      <Topbar username={profile.username} isAdmin={isAdmin} />
      <div className="flex flex-1">
        <Sidebar isAdmin={isAdmin} />
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
