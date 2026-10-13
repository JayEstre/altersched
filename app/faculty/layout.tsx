<<<<<<< HEAD
import PortalLayout from '@/components/portal-layout'
import { requireRole } from '@/lib/auth/require-role'
import { facultyNavigation } from '@/lib/navigation'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(['faculty'])
=======
import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { facultyNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["faculty"]);
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return (
    <PortalLayout
      title="Instructor"
      subtitle="INSTRUCTOR PORTAL"
<<<<<<< HEAD
      name={profile.full_name || 'Instructor'}
=======
      name={profile.full_name || "Instructor"}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      email={user.email}
      navigation={facultyNavigation}
    >
      {children}
    </PortalLayout>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}
