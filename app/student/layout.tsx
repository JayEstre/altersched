import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";

const navigation = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/schedule", label: "My Schedule" },
  { href: "/student/schedule/qr", label: "Claim Schedule" },
  { href: "/student/notifications", label: "Notifications" },
  { href: "/student/profile", label: "Profile" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireRole(["student"]);

  return (
    <PortalLayout
      title="Student Portal"
      subtitle="STUDENT"
      name={profile.full_name || "Student"}
      email={user.email}
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  );
}
