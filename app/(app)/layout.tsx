import { getCurrentProfile } from "@/lib/dal";
import { Topbar } from "@/components/layout/topbar";
import { TopNav } from "@/components/layout/top-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F3F0]">
      <Topbar username={profile.username} isAdmin={profile.role === "admin"} />
      <div className="mx-auto w-full max-w-5xl flex-1 p-6">
        <TopNav />
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
