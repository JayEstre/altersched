import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";

type ScheduleEntry = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  entry_type: string;
  section_id: string;
  room_id: string | null;
  class_offering_id: string;
  schedule_version_id: string;
};

type ClassOffering = {
  id: string;
  subject_id: string;
  section_id: string;
};

type Subject = {
  id: string;
  code: string;
  name: string;
};

type Section = {
  id: string;
  code: string | null;
  name: string | null;
};

type Room = {
  id: string;
  code: string | null;
  name: string | null;
};

type ScheduleVersion = {
  id: string;
  schedule_id: string;
  status: string;
};

type Schedule = {
  id: string;
  title: string | null;
  status: string;
  semester_id: string;
  current_version_id: string | null;
};

type Semester = {
  id: string;
  name: string;
  academic_year_id: string;
};

type AcademicYear = {
  id: string;
  name: string;
};

const DAYS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default async function MySchedulePage() {
  const { profile } = await requireRole([
    "department_scheduler",
  ]);

  const supabase = await createClient();

  /*
   * ---------------------------------------------------------
   * FACULTY PROFILE
   * ---------------------------------------------------------
   */

  const {
    data: facultyProfile,
    error: facultyError,
  } = await supabase
    .from("faculty_profiles")
    .select(`
      id,
      employee_id,
      department_id
    `)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (facultyError) {
    console.error(
      "Faculty profile lookup failed:",
      facultyError
    );
  }

  if (!facultyProfile) {
    return (
      <div style={{ padding: 24 }}>
        <h1>My Schedule</h1>

        <div
          className="portal-alert portal-alert-danger"
          style={{ marginTop: 20 }}
        >
          <strong>Faculty Profile Required</strong>

          <span>
            Your scheduler account does not have a
            Faculty scheduling profile.
          </span>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * SCHEDULE ENTRIES ASSIGNED TO THIS FACULTY
   * ---------------------------------------------------------
   */

  const {
    data: entriesData,
    error: entriesError,
  } = await supabase
    .from("schedule_entries")
    .select(`
      id,
      schedule_version_id,
      class_offering_id,
      section_id,
      room_id,
      day_of_week,
      start_time,
      end_time,
      entry_type
    `)
    .eq("faculty_id", facultyProfile.id)
    .order("day_of_week")
    .order("start_time");

  if (entriesError) {
    console.error(
      "Faculty schedule entries lookup failed:",
      entriesError
    );
  }

  const entries =
    (entriesData ?? []) as ScheduleEntry[];

  /*
   * ---------------------------------------------------------
   * EMPTY
   * ---------------------------------------------------------
   */

  if (entries.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            marginBottom: 28,
          }}
        >
          <div
            style={{
              color: "#58a6ff",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              marginBottom: 8,
            }}
          >
            TEACHING SCHEDULE
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
            }}
          >
            My Schedule
          </h1>

          <p
            className="muted"
            style={{
              marginTop: 8,
            }}
          >
            View your assigned published teaching
            schedule.
          </p>
        </div>

        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 28,
          }}
        >
          <strong>
            No teaching schedule available
          </strong>

          <p
            className="muted"
            style={{
              marginBottom: 0,
              marginTop: 8,
            }}
          >
            You currently have no schedule entries
            assigned to your Faculty profile.
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * RELATED DATA
   * ---------------------------------------------------------
   */

  const offeringIds = [
    ...new Set(
      entries.map(
        (entry) =>
          entry.class_offering_id
      )
    ),
  ];

  const sectionIds = [
    ...new Set(
      entries.map(
        (entry) =>
          entry.section_id
      )
    ),
  ];

  const roomIds = [
    ...new Set(
      entries
        .map(
          (entry) =>
            entry.room_id
        )
        .filter(
          (id): id is string =>
            Boolean(id)
        )
    ),
  ];

  const versionIds = [
    ...new Set(
      entries.map(
        (entry) =>
          entry.schedule_version_id
      )
    ),
  ];

  const [
    offeringsResult,
    sectionsResult,
    roomsResult,
    versionsResult,
  ] = await Promise.all([
    supabase
      .from("class_offerings")
      .select(`
        id,
        subject_id,
        section_id
      `)
      .in("id", offeringIds),

    supabase
      .from("sections")
      .select(`
        id,
        code,
        name
      `)
      .in("id", sectionIds),

    roomIds.length
      ? supabase
          .from("rooms")
          .select(`
            id,
            code,
            name
          `)
          .in("id", roomIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    supabase
      .from("schedule_versions")
      .select(`
        id,
        schedule_id,
        status
      `)
      .in("id", versionIds),
  ]);

  const offerings =
    (offeringsResult.data ??
      []) as ClassOffering[];

  const sections =
    (sectionsResult.data ??
      []) as Section[];

  const rooms =
    (roomsResult.data ??
      []) as Room[];

  const versions =
    (versionsResult.data ??
      []) as ScheduleVersion[];

  /*
   * ---------------------------------------------------------
   * ONLY PUBLISHED / CURRENT VERSIONS
   * ---------------------------------------------------------
   */

  const scheduleIds = [
    ...new Set(
      versions.map(
        (version) =>
          version.schedule_id
      )
    ),
  ];

  const {
    data: schedulesData,
  } = scheduleIds.length
    ? await supabase
        .from("schedules")
        .select(`
          id,
          title,
          status,
          semester_id,
          current_version_id
        `)
        .in("id", scheduleIds)
    : {
        data: [],
      };

  const schedules =
    (schedulesData ??
      []) as Schedule[];

  const publishedSchedules =
    schedules.filter(
      (schedule) =>
        schedule.status ===
          "published" &&
        Boolean(
          schedule.current_version_id
        )
    );

  const publishedVersionIds =
    new Set(
      publishedSchedules
        .map(
          (schedule) =>
            schedule.current_version_id
        )
        .filter(
          (id): id is string =>
            Boolean(id)
        )
    );

  const publishedEntries =
    entries.filter(
      (entry) =>
        publishedVersionIds.has(
          entry.schedule_version_id
        )
    );

  /*
   * ---------------------------------------------------------
   * SUBJECTS
   * ---------------------------------------------------------
   */

  const subjectIds = [
    ...new Set(
      offerings.map(
        (offering) =>
          offering.subject_id
      )
    ),
  ];

  const {
    data: subjectsData,
  } = subjectIds.length
    ? await supabase
        .from("subjects")
        .select(`
          id,
          code,
          name
        `)
        .in("id", subjectIds)
    : {
        data: [],
      };

  const subjects =
    (subjectsData ??
      []) as Subject[];

  /*
   * ---------------------------------------------------------
   * SEMESTERS
   * ---------------------------------------------------------
   */

  const semesterIds = [
    ...new Set(
      publishedSchedules.map(
        (schedule) =>
          schedule.semester_id
      )
    ),
  ];

  const {
    data: semestersData,
  } = semesterIds.length
    ? await supabase
        .from("semesters")
        .select(`
          id,
          name,
          academic_year_id
        `)
        .in("id", semesterIds)
    : {
        data: [],
      };

  const semesters =
    (semestersData ??
      []) as Semester[];

  const academicYearIds = [
    ...new Set(
      semesters.map(
        (semester) =>
          semester.academic_year_id
      )
    ),
  ];

  const {
    data: academicYearsData,
  } = academicYearIds.length
    ? await supabase
        .from("academic_years")
        .select(`
          id,
          name
        `)
        .in(
          "id",
          academicYearIds
        )
    : {
        data: [],
      };

  const academicYears =
    (academicYearsData ??
      []) as AcademicYear[];

  /*
   * ---------------------------------------------------------
   * SORT
   * ---------------------------------------------------------
   */

  publishedEntries.sort(
    (a, b) => {
      if (
        a.day_of_week !==
        b.day_of_week
      ) {
        return (
          a.day_of_week -
          b.day_of_week
        );
      }

      return a.start_time.localeCompare(
        b.start_time
      );
    }
  );

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div
      style={{
        padding: 24,
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: 28,
        }}
      >
        <div
          style={{
            color: "#58a6ff",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.4,
            marginBottom: 8,
          }}
        >
          TEACHING SCHEDULE
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 30,
          }}
        >
          My Schedule
        </h1>

        <p
          className="muted"
          style={{
            marginTop: 8,
          }}
        >
          Your published teaching assignments,
          class times, blocks, and rooms.
        </p>
      </div>

      {/* SUMMARY */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <SummaryCard
          label="Teaching Sessions"
          value={
            publishedEntries.length
          }
        />

        <SummaryCard
          label="Teaching Days"
          value={
            new Set(
              publishedEntries.map(
                (entry) =>
                  entry.day_of_week
              )
            ).size
          }
        />

        <SummaryCard
          label="Published"
          value={
            publishedEntries.length
              ? "Active"
              : "None"
          }
        />
      </div>

      {/* TABLE */}

      <section
        style={{
          border:
            "1px solid var(--line)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding:
              "18px 20px",
            borderBottom:
              "1px solid var(--line)",
          }}
        >
          <strong>
            Published Teaching Schedule
          </strong>

          <p
            className="muted"
            style={{
              margin:
                "5px 0 0",
              fontSize: 11,
            }}
          >
            Only your current published
            assignments are shown.
          </p>
        </div>

        {publishedEntries.length ===
        0 ? (
          <div
            style={{
              padding: 28,
            }}
          >
            <strong>
              No published schedule
            </strong>

            <p
              className="muted"
              style={{
                marginBottom: 0,
              }}
            >
              No published teaching
              assignments are currently
              available.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Block</th>
                  <th>Room</th>
                  <th>Term</th>
                </tr>
              </thead>

              <tbody>
                {publishedEntries.map(
                  (entry) => {
                    const offering =
                      offerings.find(
                        (item) =>
                          item.id ===
                          entry.class_offering_id
                      );

                    const subject =
                      subjects.find(
                        (item) =>
                          item.id ===
                          offering?.subject_id
                      );

                    const section =
                      sections.find(
                        (item) =>
                          item.id ===
                          entry.section_id
                      );

                    const room =
                      rooms.find(
                        (item) =>
                          item.id ===
                          entry.room_id
                      );

                    const version =
                      versions.find(
                        (item) =>
                          item.id ===
                          entry.schedule_version_id
                      );

                    const schedule =
                      publishedSchedules.find(
                        (item) =>
                          item.id ===
                          version?.schedule_id
                      );

                    const semester =
                      semesters.find(
                        (item) =>
                          item.id ===
                          schedule?.semester_id
                      );

                    const academicYear =
                      academicYears.find(
                        (item) =>
                          item.id ===
                          semester?.academic_year_id
                      );

                    return (
                      <tr
                        key={
                          entry.id
                        }
                      >
                        <td>
                          <strong>
                            {DAYS[
                              entry.day_of_week
                            ] ??
                              "—"}
                          </strong>
                        </td>

                        <td>
                          {formatTime(
                            entry.start_time
                          )}
                          {" – "}
                          {formatTime(
                            entry.end_time
                          )}
                        </td>

                        <td>
                          <strong>
                            {subject?.code ??
                              "—"}
                          </strong>

                          <div
                            className="muted"
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                            }}
                          >
                            {subject?.name ??
                              "Subject"}
                          </div>
                        </td>

                        <td>
                          {section?.code ||
                            section?.name ||
                            "—"}
                        </td>

                        <td>
                          {room?.code ||
                            room?.name ||
                            "—"}
                        </td>

                        <td>
                          {semester?.name ??
                            "—"}

                          {academicYear
                            ? ` — ${academicYear.name}`
                            : ""}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        border:
          "1px solid var(--line)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: 10,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 24,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function formatTime(
  value: string
) {
  if (!value) {
    return "—";
  }

  const [hourText, minuteText] =
    value.split(":");

  const hour =
    Number(hourText);

  const minute =
    Number(minuteText ?? 0);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value;
  }

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
}