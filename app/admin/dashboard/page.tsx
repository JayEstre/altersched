import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead, Stat, Empty, Badge } from "@/components/ui";
import { Users, Building2, DoorOpen, BookOpenCheck, CalendarRange, GitPullRequest, ArrowRight, Upload, Settings, ShieldCheck } from "lucide-react";

export const revalidate = 60;

export default async function Page() {
  const supabase = await createClient();

  const [
    users,
    facultyProfiles,
    departments,
    rooms,
    offerings,
    schedules,
    publishedSchedules,
    pendingRequests,
    unresolvedValidation,
    activeYear,
    activeSemester,
    recentSchedules,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("faculty_profiles").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("class_offerings").select("id", { count: "exact", head: true }),
    supabase.from("schedules").select("id", { count: "exact", head: true }),
    supabase.from("schedules").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("schedule_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("schedule_validation_logs").select("id", { count: "exact", head: true }).eq("resolved", false),
    supabase.from("academic_years").select("id,name").eq("is_active", true).maybeSingle(),
    supabase.from("semesters").select("id,name").eq("is_active", true).maybeSingle(),
    supabase.from("schedules").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  const healthScore = Math.max(0, 100 - ((unresolvedValidation.count ?? 0) * 12) - ((pendingRequests.count ?? 0) * 8));
  const healthTone = healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'danger';
  const healthLabel = healthScore >= 80 ? 'Stable' : healthScore >= 60 ? 'Watchlist' : 'Critical';

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
        <Stat label="User Accounts" value={users.count || 0} hint="Registered system users" icon={<Users size={16} />} />
        <Stat label="Faculty Profiles" value={facultyProfiles.count || 0} hint="Active faculty roster" icon={<Users size={16} />} />
        <Stat label="Active Departments" value={departments.count || 0} hint="Available academic units" icon={<Building2 size={16} />} />
        <Stat label="Active Rooms" value={rooms.count || 0} hint="Ready for scheduling" icon={<DoorOpen size={16} />} />
        <Stat label="Class Offerings" value={offerings.count || 0} hint="Scheduling inputs" icon={<BookOpenCheck size={16} />} />
        <Stat label="Schedules" value={schedules.count || 0} hint="Generated records" icon={<CalendarRange size={16} />} />
        <Stat label="Published" value={publishedSchedules.count || 0} hint="Official schedule records" icon={<ShieldCheck size={16} />} />
        <Stat label="Pending Alterations" value={pendingRequests.count || 0} hint="Requests needing review" icon={<GitPullRequest size={16} />} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>System health</h3>
            <p>Current operational readiness for the scheduling environment.</p>
          </div>
        </div>

        <div className="stats-grid">
          <Stat
            label="Platform Health"
            value={`${healthScore}%`}
            hint="Operational stability index"
            icon={<Badge tone={healthTone}>{healthLabel}</Badge>}
          />
          <Stat label="Open Validation" value={unresolvedValidation.count || 0} hint="Unresolved schedule blockers" />
          <Stat label="Approval Queue" value={pendingRequests.count || 0} hint="Pending admin review" />
        </div>
      </section>

      <section className="dashboard-quick-actions" aria-label="Quick actions">
        <Link href="/admin/schedule-builder" className="quick-action-card"><span className="quick-action-icon"><CalendarRange size={19} /></span><span><strong>Build a schedule</strong><small>Create and validate a new schedule</small></span><ArrowRight size={17} /></Link>
        <Link href="/admin/import-export" className="quick-action-card"><span className="quick-action-icon"><Upload size={19} /></span><span><strong>Import academic data</strong><small>Bring in reference and scheduling data</small></span><ArrowRight size={17} /></Link>
        <Link href="/admin/settings" className="quick-action-card"><span className="quick-action-icon"><Settings size={19} /></span><span><strong>System settings</strong><small>Manage AlterSched configuration</small></span><ArrowRight size={17} /></Link>
      </section>

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
                <span>
                  <Badge tone={schedule.status === 'published' ? 'success' : schedule.status === 'submitted' ? 'warning' : 'info'}>
                    {schedule.status}
                  </Badge>
                </span>
              </Link>
            ))}
          </div>
        ) : <Empty text="Schedules will appear here after they are created." />}
      </section>
    </>
  );
}
