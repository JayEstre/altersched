<<<<<<< HEAD
import PortalLayout from '@/components/portal-layout'
import { requireRole } from '@/lib/auth/require-role'
import { schedulerNavigation } from '@/lib/navigation'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(['department_scheduler'])
=======
import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { schedulerNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["department_scheduler"]);
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return (
    <PortalLayout
      title="Department Scheduler"
      subtitle="SCHEDULER PORTAL"
<<<<<<< HEAD
      name={profile.full_name || 'Department Scheduler'}
=======
      name={profile.full_name || "Department Scheduler"}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      email={user.email}
      navigation={schedulerNavigation}
    >
      {children}
    </PortalLayout>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}
