import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { schedulerNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["department_scheduler"]);

  return (
    <PortalLayout
      title="Department Scheduler"
      subtitle="SCHEDULER PORTAL"
      name={profile.full_name || "Department Scheduler"}
      email={user.email}
      navigation={schedulerNavigation}
    >
      {children}
    </PortalLayout>
  );
}
