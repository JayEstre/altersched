import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead, Stat, Empty, Badge } from "@/components/ui";

export default async function Page() {
  const supabase = await createClient();

  const [
    users,
    departments,
    rooms,
    offerings,
    schedules,
    pendingRequests,
    activeYear,
    activeSemester,
    recentSchedules,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("class_offerings").select("id", { count: "exact", head: true }),
    supabase.from("schedules").select("id", { count: "exact", head: true }),
    supabase.from("schedule_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("academic_years").select("id,name").eq("is_active", true).maybeSingle(),
    supabase.from("semesters").select("id,name").eq("is_active", true).maybeSingle(),
    supabase.from("schedules").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  return (
    <>
      <PageHead
        eyebrow="CCTC OPERATIONS"
        title="Administration Dashboard"
        description="A live overview of Consolatrix College of Toledo City's academic scheduling environment."
        actions={<Link className="btn btn-primary" href="/admin/schedule-builder">Open Schedule Builder</Link>}
      />

      <div className="context-strip">
        <div><span>Academic Year</span><strong>{activeYear.data?.name || "Not configured"}</strong></div>
        <div><span>Active Term</span><strong>{activeSemester.data?.name || "Not configured"}</strong></div>
      </div>

      <div className="stats-grid">
        <Stat label="User Accounts" value={users.count || 0} />
        <Stat label="Active Departments" value={departments.count || 0} />
        <Stat label="Active Rooms" value={rooms.count || 0} />
        <Stat label="Class Offerings" value={offerings.count || 0} />
        <Stat label="Schedules" value={schedules.count || 0} />
        <Stat label="Pending Alterations" value={pendingRequests.count || 0} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div><h3>Recent Schedules</h3><p>Recently updated schedule records in the current CCTC deployment.</p></div>
          <Link href="/admin/schedules" className="btn btn-outline">View all</Link>
        </div>
        {recentSchedules.data?.length ? (
          <div className="schedule-grid">
            {recentSchedules.data.map((schedule) => (
              <Link href="/admin/schedules" className="schedule-item" key={schedule.id}>
                <strong>{schedule.title}</strong>
                <span><Badge>{schedule.status}</Badge></span>
              </Link>
            ))}
          </div>
        ) : <Empty text="Schedules will appear here after they are created." />}
      </section>
    </>
  );
}
