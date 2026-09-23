import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";

const navigation = [
  { href: "/faculty/dashboard", label: "Dashboard" },
  { href: "/faculty/schedule", label: "My Schedule" },
  { href: "/faculty/teaching-load", label: "Teaching Load" },
  { href: "/faculty/availability", label: "Availability" },
  { href: "/faculty/change-requests", label: "Alteration Requests" },
  { href: "/faculty/notifications", label: "Notifications" },
  { href: "/faculty/profile", label: "Profile" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireRole(["faculty"]);

  return (
    <PortalLayout
      title="Faculty Portal"
      subtitle="FACULTY"
      name={profile.full_name || "Faculty"}
      email={user.email}
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  );
}
