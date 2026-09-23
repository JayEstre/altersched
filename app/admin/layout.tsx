import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users & Approvals" },
  { href: "/admin/academic", label: "Academic Setup" },
  { href: "/admin/subjects", label: "Subjects & Curriculum" },
  { href: "/admin/faculty", label: "Faculty" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/class-offerings", label: "Class Offerings" },
  { href: "/admin/schedule-builder", label: "Generate Schedule" },
  { href: "/admin/schedules", label: "Schedules & Publish" },
  { href: "/admin/change-requests", label: "Schedule Alterations" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireRole(["super_admin"]);

  return (
    <PortalLayout
      title="Super Administrator"
      subtitle="ADMIN PORTAL"
      name={profile.full_name || "Super"}
      email={user.email}
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  );
}
