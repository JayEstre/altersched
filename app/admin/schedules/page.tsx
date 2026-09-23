import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead, Stat, Empty, Badge } from "@/components/ui";
import { publishSchedule, archiveSchedule } from "./actions";

type SearchParams = Record<string, string | undefined>;

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();

  // ============================================================
  // LOAD SCHEDULES
  // ============================================================

  const {
    data: scheduleData,
    error: scheduleError,
  } = await supabase
    .from("schedules")
    .select(`
      id,
      title,
      status,
      updated_at,
      current_version_id,
      section_id,
      program_id,
      semester_id,
      sections (
        code
      ),
      programs (
        code
      ),
      semesters (
        name
      )
    `)
    .order("updated_at", { ascending: false });

  const rows = scheduleData ?? [];

  // ============================================================
  // LOAD VERSION RECORDS SEPARATELY
  //
  // IMPORTANT:
  // schedules <-> schedule_versions has more than one relationship.
  // Querying schedule_versions directly inside schedules.select()
  // therefore causes Supabase/PostgREST relationship ambiguity.
  // ============================================================

  const scheduleIds = rows.map((row: any) => row.id);

  let versions: any[] = [];
  let versionError: { message: string } | null = null;

  if (scheduleIds.length > 0) {
    const result = await supabase
      .from("schedule_versions")
      .select(`
        id,
        schedule_id,
        version_number,
        status,
        published_at
      `)
      .in("schedule_id", scheduleIds);

    versions = result.data ?? [];
    versionError = result.error;
  }

  // ============================================================
  // VERSION COUNT PER SCHEDULE
  // ============================================================

  const versionCount = new Map<string, number>();

  for (const version of versions) {
    const current = versionCount.get(version.schedule_id) ?? 0;

    versionCount.set(
      version.schedule_id,
      current + 1
    );
  }

  // ============================================================
  // PAGE ERROR
  // ============================================================

  const pageError =
    params.details ||
    scheduleError?.message ||
    versionError?.message ||
    params.error;

  // ============================================================
  // STATS
  // ============================================================

  const draftCount = rows.filter(
    (row: any) => row.status === "draft"
  ).length;

  const publishedCount = rows.filter(
    (row: any) => row.status === "published"
  ).length;

  const archivedCount = rows.filter(
    (row: any) => row.status === "archived"
  ).length;

  return (
    <>
      <PageHead
        eyebrow="VERSION CONTROL"
        title="Schedules"
        description="Review generated schedules, publish validated versions, distribute access codes, and archive obsolete schedules."
      />

      {/* ====================================================== */}
      {/* STATS                                                  */}
      {/* ====================================================== */}

      <div className="stats-grid">
        <Stat
          label="Schedule Records"
          value={rows.length}
        />

        <Stat
          label="Draft"
          value={draftCount}
        />

        <Stat
          label="Published"
          value={publishedCount}
        />

        <Stat
          label="Archived"
          value={archivedCount}
        />
      </div>

      {/* ====================================================== */}
      {/* SUCCESS: PUBLISHED                                     */}
      {/* ====================================================== */}

      {params.success === "published" && (
        <div className="portal-alert portal-alert-success">
          <strong>Schedule published.</strong>

          <span>
            Student code:{" "}
            <b>{params.code ?? "—"}</b>
            {" — "}
            distribute this only to the correct block.

            {params.qr && (
              <>
                {" "}
                QR token: <b>{params.qr}</b>
              </>
            )}
          </span>
        </div>
      )}

      {/* ====================================================== */}
      {/* SUCCESS: ARCHIVED                                      */}
      {/* ====================================================== */}

      {params.success === "archived" && (
        <div className="portal-alert portal-alert-success">
          <strong>Schedule archived.</strong>

          <span>
            Its active access codes were revoked.
          </span>
        </div>
      )}

      {/* ====================================================== */}
      {/* ERROR                                                  */}
      {/* ====================================================== */}

      {pageError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Action failed.</strong>

          <span>{pageError}</span>
        </div>
      )}

      {/* ====================================================== */}
      {/* SCHEDULE TABLE                                         */}
      {/* ====================================================== */}

      <div className="panel">
        {rows.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th>Program / Block</th>
                  <th>Term</th>
                  <th>Versions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((schedule: any) => {
                  const programCode =
                    Array.isArray(schedule.programs)
                      ? schedule.programs[0]?.code
                      : schedule.programs?.code;

                  const sectionCode =
                    Array.isArray(schedule.sections)
                      ? schedule.sections[0]?.code
                      : schedule.sections?.code;

                  const semesterName =
                    Array.isArray(schedule.semesters)
                      ? schedule.semesters[0]?.name
                      : schedule.semesters?.name;

                  const versionsForSchedule =
                    versionCount.get(schedule.id) ?? 0;

                  return (
                    <tr key={schedule.id}>
                      {/* SCHEDULE */}

                      <td>
                        <strong>
                          {schedule.title || "Untitled"}
                        </strong>
                      </td>

                      {/* PROGRAM / BLOCK */}

                      <td>
                        {programCode || "—"} /{" "}
                        {sectionCode || "—"}
                      </td>

                      {/* TERM */}

                      <td>
                        {semesterName || "—"}
                      </td>

                      {/* VERSION COUNT */}

                      <td>
                        {versionsForSchedule}
                      </td>

                      {/* STATUS */}

                      <td>
                        <Badge>
                          {schedule.status}
                        </Badge>
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link href={`/admin/schedules/${schedule.id}`} className="user-btn">
                            {schedule.status === "draft" ? "Review / Edit" : "View"}
                          </Link>

                          {/* PUBLISH */}

                          {schedule.status !== "published" &&
                            schedule.status !== "archived" && (
                              <form action={publishSchedule}>
                                <input
                                  type="hidden"
                                  name="schedule_id"
                                  value={schedule.id}
                                />

                                <button
                                  type="submit"
                                  className="user-btn user-btn-primary"
                                >
                                  Publish
                                </button>
                              </form>
                            )}

                          {/* ARCHIVE */}

                          {schedule.status !== "archived" && (
                            <form action={archiveSchedule}>
                              <input
                                type="hidden"
                                name="schedule_id"
                                value={schedule.id}
                              />

                              <button
                                type="submit"
                                className="user-btn user-btn-danger-soft"
                              >
                                Archive
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No schedules found. Generate a schedule first." />
        )}
      </div>
    </>
  );
}