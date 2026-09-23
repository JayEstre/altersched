import PortalLayout from "@/components/portal-layout";
import { requireRole } from "@/lib/auth/require-role";

const navigation = [
  {
    href: "/scheduler/dashboard",
    label: "Dashboard",
  },
  {
    href: "/scheduler/my-schedule",
    label: "My Schedule",
  },
  {
    href: "/scheduler/class-offerings",
    label: "Class Offerings",
  },
  {
    href: "/scheduler/faculty",
    label: "Faculty",
  },
  {
    href: "/scheduler/rooms",
    label: "Rooms",
  },
  {
    href: "/scheduler/schedule-builder",
    label: "Schedule Builder",
  },
  {
    href: "/scheduler/schedules",
    label: "Schedules",
  },
  {
    href: "/scheduler/change-requests",
    label: "Change Requests",
  },
  {
    href: "/scheduler/notifications",
    label: "Notifications",
  },
  {
    href: "/scheduler/profile",
    label: "Profile",
  },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireRole([
    "department_scheduler",
  ]);

  return (
    <PortalLayout
      title="Department Scheduler"
      subtitle="SCHEDULER PORTAL"
      name={
        profile.full_name ||
        "Department Scheduler"
      }
      email={user.email}
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  );
}