import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { facultyNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["faculty"]);

  return (
    <PortalLayout
      title="Instructor"
      subtitle="INSTRUCTOR PORTAL"
      name={profile.full_name || "Instructor"}
      email={user.email}
      navigation={facultyNavigation}
    >
      {children}
    </PortalLayout>
  );
}
