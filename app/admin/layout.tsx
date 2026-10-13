<<<<<<< HEAD
import PortalLayout from '@/components/portal-layout'
import { requireRole } from '@/lib/auth/require-role'
import { adminNavigation } from '@/lib/navigation'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(['super_admin'])
=======
import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";
import { adminNavigation } from "@/lib/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["super_admin"]);
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return (
    <PortalLayout
      title="Administrator"
      subtitle="ADMIN PORTAL"
<<<<<<< HEAD
      name={profile.full_name || 'Administrator'}
=======
      name={profile.full_name || "Administrator"}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      email={user.email}
      navigation={adminNavigation}
    >
      {children}
    </PortalLayout>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}
