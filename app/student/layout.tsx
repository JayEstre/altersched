import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { studentNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["student"]);

  return (
    <PortalLayout
      title="Student Portal"
      subtitle="STUDENT"
      name={profile.full_name || "Student"}
      email={user.email}
      navigation={studentNavigation}
    >
      {children}
    </PortalLayout>
  );
}
