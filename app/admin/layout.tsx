import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { adminNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["super_admin"]);

  return (
    <PortalLayout
      title="Administrator"
      subtitle="ADMIN PORTAL"
      name={profile.full_name || "Administrator"}
      email={user.email}
      navigation={adminNavigation}
    >
      {children}
    </PortalLayout>
  );
}
