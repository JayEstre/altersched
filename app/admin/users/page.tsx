import { createClient } from "@/lib/supabase/server";
import {
  PageHead,
  Empty,
  Badge,
} from "@/components/ui";

import {
  approveUser,
  rejectUser,
  suspendUser,
} from "./actions";

import {
  promoteToDepartmentScheduler,
  assignSchedulerDepartment,
  revokeSchedulerDepartment,
  demoteSchedulerToFaculty,
} from "./scheduler-actions";

/* =========================================================
   TYPES
   ========================================================= */

type UserRole =
  | "super_admin"
  | "department_scheduler"
  | "faculty"
  | "student";

type AccountStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "inactive";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  account_status: AccountStatus;
  created_at: string;
};

type Department = {
  id: string;
  code: string | null;
  name: string;
};

type Program = {
  id: string;
  department_id: string;
  code: string | null;
  name: string;
  is_active: boolean;
};

type YearLevel = {
  id: string;
  program_id: string;
  name: string;
  level_number: number;
  is_active: boolean;
};

type Section = {
  id: string;
  year_level_id: string;
  code: string | null;
  name: string;
  is_active: boolean;
};

type StudentProfile = {
  id: string;
  profile_id: string;
  student_id: string;
  department_id: string;
  program_id: string;
  year_level_id: string;
  section_id: string;
};

type SchedulerAssignment = {
  id: string;
  profile_id: string;
  department_id: string;
  active: boolean;
};

type Semester = {
  id: string;
  name: string;
  is_active: boolean;
  academic_years:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

/* =========================================================
   PAGE
   ========================================================= */

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    role?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const supabase =
    await createClient();

  const params = searchParams
    ? await searchParams
    : {};

  /* =======================================================
     LOAD USERS
     ======================================================= */

  let usersQuery = supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      account_status,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (params.status) {
    usersQuery =
      usersQuery.eq(
        "account_status",
        params.status
      );
  }

  if (params.role) {
    usersQuery =
      usersQuery.eq(
        "role",
        params.role
      );
  }

  /* =======================================================
     LOAD DIRECTORY DATA
     ======================================================= */

  const [
    usersResult,
    allUsersResult,
    departmentsResult,
    assignmentsResult,
    programsResult,
    yearLevelsResult,
    sectionsResult,
    studentProfilesResult,
    semestersResult,
  ] = await Promise.all([
    usersQuery,

    supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        role,
        account_status,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("departments")
      .select(`
        id,
        code,
        name
      `)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("scheduler_departments")
      .select(`
        id,
        profile_id,
        department_id,
        active
      `)
      .eq("active", true),

    supabase
      .from("programs")
      .select(`
        id,
        department_id,
        code,
        name,
        is_active
      `)
      .eq("is_active", true)
      .order("code"),

    supabase
      .from("year_levels")
      .select(`
        id,
        program_id,
        name,
        level_number,
        is_active
      `)
      .eq("is_active", true)
      .order("level_number"),

    supabase
      .from("sections")
      .select(`
        id,
        year_level_id,
        code,
        name,
        is_active
      `)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("student_profiles")
      .select(`
        id,
        profile_id,
        student_id,
        department_id,
        program_id,
        year_level_id,
        section_id
      `),

    supabase
      .from("semesters")
      .select(`
        id,
        name,
        is_active,
        academic_years (
          name
        )
      `)
      .order("start_date", {
        ascending: false,
      }),
  ]);

  /* =======================================================
     NORMALIZE
     ======================================================= */

  const users =
    (usersResult.data ??
      []) as UserRow[];

  const allUsers =
    (allUsersResult.data ??
      []) as UserRow[];

  const departments =
    (departmentsResult.data ??
      []) as Department[];

  const assignments =
    (assignmentsResult.data ??
      []) as SchedulerAssignment[];

  const programs =
    (programsResult.data ??
      []) as Program[];

  const yearLevels =
    (yearLevelsResult.data ??
      []) as YearLevel[];

  const sections =
    (sectionsResult.data ??
      []) as Section[];

  const studentProfiles =
    (studentProfilesResult.data ??
      []) as StudentProfile[];

  const semesters =
    (semestersResult.data ??
      []) as Semester[];

  /* =======================================================
     COUNTS
     ======================================================= */

  const pendingCount =
    allUsers.filter(
      (user) =>
        user.account_status ===
        "pending"
    ).length;

  const approvedCount =
    allUsers.filter(
      (user) =>
        user.account_status ===
        "approved"
    ).length;

  const approvedStudents =
    allUsers.filter(
      (user) =>
        user.role === "student" &&
        user.account_status ===
          "approved"
    );

  const facultyUsers =
    allUsers.filter(
      (user) =>
        user.role === "faculty" ||
        user.role ===
          "department_scheduler"
    );

  /* =======================================================
     ACTIVE SEMESTER
     ======================================================= */

  const activeSemester =
    semesters.find(
      (semester) =>
        semester.is_active
    ) ?? null;

  const activeAcademicYear =
    getAcademicYearName(
      activeSemester
        ?.academic_years ?? null
    );

  const semesterLabel =
    activeSemester
      ? `${activeSemester.name}${
          activeAcademicYear
            ? ` — ${activeAcademicYear}`
            : ""
        }`
      : "No active semester";

  /* =======================================================
     ERRORS
     ======================================================= */

  const directoryLoadError =
    Boolean(
      programsResult.error ||
        yearLevelsResult.error ||
        sectionsResult.error ||
        studentProfilesResult.error
    );

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <>
      <PageHead
        eyebrow="ADMINISTRATION"
        title="User Management"
        description="Approve registrations, manage account access, and organize students by Program, Year Level, and Block."
      />

      {params.error && (
        <div className="portal-alert portal-alert-danger">
          <strong>Account action failed</strong>
          <span>{getAccountActionError(params.error)}</span>
        </div>
      )}

      {params.success && (
        <div className="portal-alert portal-alert-success">
          <strong>Account updated</strong>
          <span>{getAccountActionSuccess(params.success)}</span>
        </div>
      )}

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="user-summary">
        <div className="user-summary-item">
          <span>
            Accounts
          </span>

          <strong>
            {allUsers.length}
          </strong>
        </div>

        <div className="user-summary-item">
          <span>
            Pending
          </span>

          <strong>
            {pendingCount}
          </strong>
        </div>

        <div className="user-summary-item">
          <span>
            Students
          </span>

          <strong>
            {approvedStudents.length}
          </strong>
        </div>

        <div className="user-summary-item">
          <span>
            Faculty
          </span>

          <strong>
            {facultyUsers.length}
          </strong>
        </div>
      </div>

      {/* ===================================================
          ACCOUNT MANAGEMENT
      =================================================== */}

      <section className="user-toolbar">
        <div className="user-toolbar-copy">
          <strong>
            Account Management
          </strong>

          <span>
            Approve registrations and
            manage Faculty, Student,
            Scheduler, and suspended
            accounts.
          </span>
        </div>

        <div className="filter-tabs">
          <FilterLink
            href="/admin/users"
            label="All"
            active={
              !params.status &&
              !params.role
            }
          />

          <FilterLink
            href="/admin/users?status=pending"
            label={`Pending (${pendingCount})`}
            active={
              params.status ===
              "pending"
            }
          />

          <FilterLink
            href="/admin/users?status=approved"
            label="Approved"
            active={
              params.status ===
              "approved"
            }
          />

          <FilterLink
            href="/admin/users?role=student"
            label="Students"
            active={
              params.role ===
              "student"
            }
          />

          <FilterLink
            href="/admin/users?role=faculty"
            label="Faculty"
            active={
              params.role ===
              "faculty"
            }
          />

          <FilterLink
            href="/admin/users?role=department_scheduler"
            label="Schedulers"
            active={
              params.role ===
              "department_scheduler"
            }
          />

          <FilterLink
            href="/admin/users?status=suspended"
            label="Suspended"
            active={
              params.status ===
              "suspended"
            }
          />
        </div>
      </section>

      {usersResult.error && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Unable to load users
          </strong>

          <span>
            The user records could not be
            retrieved.
          </span>
        </div>
      )}

      {!usersResult.error &&
        users.length === 0 && (
          <Empty
            title="No users found"
            text="There are no accounts matching the selected filter."
          />
        )}

      {/* ===================================================
          ACCOUNT CARDS
      =================================================== */}

      <section className="user-list">
        {users.map((user) => {
          const userAssignments =
            assignments.filter(
              (assignment) =>
                assignment.profile_id ===
                user.id
            );

          return (
            <UserAccountCard
              key={user.id}
              user={user}
              assignments={
                userAssignments
              }
              departments={
                departments
              }
            />
          );
        })}
      </section>

      {/* ===================================================
          STUDENT DIRECTORY
      =================================================== */}

      <section
        className="sched-section"
        style={{
          marginTop: 24,
        }}
      >
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              STUDENT DIRECTORY
            </span>

            <h3>
              Students by Program
            </h3>

            <p>
              Browse approved students by
              Program, Year Level, and
              Block.
            </p>
          </div>

          <Badge tone="info">
            {approvedStudents.length}
            {" Students"}
          </Badge>
        </div>

        <div className="sched-section-body">
          {/* ===============================================
              SEMESTER CONTEXT
          =============================================== */}

          <div className="sched-info">
            <div className="sched-info-icon">
              S
            </div>

            <div>
              <strong>
                Current Academic Period
              </strong>

              <p>
                {semesterLabel}. Semester
                is shown as academic
                context while student
                organization remains
                Program → Year Level →
                Block.
              </p>
            </div>
          </div>

          {/* ===============================================
              DIRECTORY ERROR
          =============================================== */}

          {directoryLoadError && (
            <div
              className="portal-alert portal-alert-danger"
              style={{
                marginTop: 18,
              }}
            >
              <strong>
                Unable to load student
                directory
              </strong>

              <span>
                One or more academic
                directory records could
                not be retrieved.
              </span>
            </div>
          )}

          {/* ===============================================
              NO PROGRAMS
          =============================================== */}

          {!directoryLoadError &&
            programs.length === 0 && (
              <div
                style={{
                  marginTop: 18,
                }}
              >
                <Empty
                  title="No Programs"
                  text="Create active Programs in Academic Setup first."
                />
              </div>
            )}

          {/* ===============================================
              PROGRAM DIRECTORY
          =============================================== */}

          {!directoryLoadError &&
            programs.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  marginTop: 18,
                }}
              >
                {programs.map(
                  (program) => {
                    const programYearLevels =
                      yearLevels.filter(
                        (yearLevel) =>
                          yearLevel.program_id ===
                          program.id
                      );

                    const programStudentProfiles =
                      studentProfiles.filter(
                        (student) =>
                          student.program_id ===
                          program.id
                      );

                    const programApprovedProfiles =
                      programStudentProfiles.filter(
                        (studentProfile) =>
                          approvedStudents.some(
                            (user) =>
                              user.id ===
                              studentProfile.profile_id
                          )
                      );

                    return (
                      <details
                        key={program.id}
                        open={
                          programApprovedProfiles.length >
                          0
                        }
                        style={{
                          border:
                            "1px solid var(--line)",
                          borderRadius: 16,
                          background:
                            "rgba(255,255,255,.018)",
                          overflow:
                            "hidden",
                        }}
                      >
                        {/* =================================
                            PROGRAM
                        ================================= */}

                        <summary
                          style={{
                            cursor:
                              "pointer",
                            listStyle:
                              "none",
                            padding:
                              "18px 20px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                              gap: 16,
                            }}
                          >
                            <div>
                              <span className="sched-kicker">
                                PROGRAM
                              </span>

                              <h3
                                style={{
                                  marginTop:
                                    5,
                                  marginBottom:
                                    4,
                                }}
                              >
                                {program.code ||
                                  program.name}
                              </h3>

                              <p className="muted">
                                {
                                  program.name
                                }
                              </p>
                            </div>

                            <Badge
                              tone={
                                programApprovedProfiles.length
                                  ? "success"
                                  : "default"
                              }
                            >
                              {
                                programApprovedProfiles.length
                              }
                              {" Students"}
                            </Badge>
                          </div>
                        </summary>

                        <div
                          style={{
                            borderTop:
                              "1px solid var(--line)",
                            padding: 20,
                            display:
                              "grid",
                            gap: 14,
                          }}
                        >
                          {programYearLevels.length ===
                          0 ? (
                            <Empty
                              title="No Year Levels"
                              text="No active Year Levels belong to this Program."
                            />
                          ) : (
                            programYearLevels.map(
                              (
                                yearLevel
                              ) => {
                                const yearSections =
                                  sections.filter(
                                    (
                                      section
                                    ) =>
                                      section.year_level_id ===
                                      yearLevel.id
                                  );

                                const yearStudentProfiles =
                                  programStudentProfiles.filter(
                                    (
                                      student
                                    ) =>
                                      student.year_level_id ===
                                      yearLevel.id
                                  );

                                const yearApprovedProfiles =
                                  yearStudentProfiles.filter(
                                    (
                                      studentProfile
                                    ) =>
                                      approvedStudents.some(
                                        (
                                          user
                                        ) =>
                                          user.id ===
                                          studentProfile.profile_id
                                      )
                                  );

                                return (
                                  <details
                                    key={
                                      yearLevel.id
                                    }
                                    open={
                                      yearApprovedProfiles.length >
                                      0
                                    }
                                    style={{
                                      border:
                                        "1px solid var(--line)",
                                      borderRadius:
                                        13,
                                      overflow:
                                        "hidden",
                                      background:
                                        "rgba(255,255,255,.015)",
                                    }}
                                  >
                                    {/* =====================
                                        YEAR LEVEL
                                    ====================== */}

                                    <summary
                                      style={{
                                        cursor:
                                          "pointer",
                                        listStyle:
                                          "none",
                                        padding:
                                          "15px 16px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display:
                                            "flex",
                                          alignItems:
                                            "center",
                                          justifyContent:
                                            "space-between",
                                          gap: 14,
                                        }}
                                      >
                                        <div>
                                          <strong>
                                            {
                                              yearLevel.name
                                            }
                                          </strong>

                                          <div
                                            className="muted"
                                            style={{
                                              marginTop:
                                                5,
                                              fontSize:
                                                10,
                                            }}
                                          >
                                            Semester:{" "}
                                            {
                                              semesterLabel
                                            }
                                          </div>
                                        </div>

                                        <Badge>
                                          {
                                            yearApprovedProfiles.length
                                          }
                                          {
                                            " Students"
                                          }
                                        </Badge>
                                      </div>
                                    </summary>

                                    {/* =====================
                                        BLOCKS
                                    ====================== */}

                                    <div
                                      style={{
                                        borderTop:
                                          "1px solid var(--line)",
                                        padding:
                                          15,
                                        display:
                                          "grid",
                                        gap: 10,
                                      }}
                                    >
                                      {yearSections.length ===
                                      0 ? (
                                        <Empty
                                          title="No Blocks"
                                          text="No active Blocks belong to this Year Level."
                                        />
                                      ) : (
                                        yearSections.map(
                                          (
                                            section
                                          ) => {
                                            const sectionStudentProfiles =
                                              yearStudentProfiles.filter(
                                                (
                                                  student
                                                ) =>
                                                  student.section_id ===
                                                  section.id
                                              );

                                            const sectionStudents =
                                              sectionStudentProfiles
                                                .map(
                                                  (
                                                    studentProfile
                                                  ) => {
                                                    const user =
                                                      approvedStudents.find(
                                                        (
                                                          item
                                                        ) =>
                                                          item.id ===
                                                          studentProfile.profile_id
                                                      );

                                                    if (
                                                      !user
                                                    ) {
                                                      return null;
                                                    }

                                                    return {
                                                      user,
                                                      studentProfile,
                                                    };
                                                  }
                                                )
                                                .filter(
                                                  Boolean
                                                ) as {
                                                user: UserRow;
                                                studentProfile: StudentProfile;
                                              }[];

                                            return (
                                              <details
                                                key={
                                                  section.id
                                                }
                                                style={{
                                                  border:
                                                    "1px solid var(--line)",
                                                  borderRadius:
                                                    11,
                                                  overflow:
                                                    "hidden",
                                                  background:
                                                    "rgba(4,12,23,.3)",
                                                }}
                                              >
                                                {/* =================
                                                    BLOCK
                                                ================== */}

                                                <summary
                                                  style={{
                                                    cursor:
                                                      "pointer",
                                                    listStyle:
                                                      "none",
                                                    padding:
                                                      "13px 14px",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display:
                                                        "flex",
                                                      alignItems:
                                                        "center",
                                                      justifyContent:
                                                        "space-between",
                                                      gap: 12,
                                                    }}
                                                  >
                                                    <div>
                                                      <strong>
                                                        {section.code ||
                                                          section.name}
                                                      </strong>

                                                      {section.code &&
                                                        section.name &&
                                                        section.code !==
                                                          section.name && (
                                                          <div
                                                            className="muted"
                                                            style={{
                                                              marginTop:
                                                                4,
                                                              fontSize:
                                                                10,
                                                            }}
                                                          >
                                                            {
                                                              section.name
                                                            }
                                                          </div>
                                                        )}
                                                    </div>

                                                    <Badge
                                                      tone={
                                                        sectionStudents.length
                                                          ? "success"
                                                          : "default"
                                                      }
                                                    >
                                                      {
                                                        sectionStudents.length
                                                      }
                                                      {
                                                        " Students"
                                                      }
                                                    </Badge>
                                                  </div>
                                                </summary>

                                                {/* =================
                                                    STUDENTS
                                                ================== */}

                                                <div
                                                  style={{
                                                    borderTop:
                                                      "1px solid var(--line)",
                                                    padding:
                                                      12,
                                                  }}
                                                >
                                                  {sectionStudents.length ===
                                                  0 ? (
                                                    <p
                                                      className="muted"
                                                      style={{
                                                        margin:
                                                          0,
                                                        fontSize:
                                                          11,
                                                      }}
                                                    >
                                                      No
                                                      approved
                                                      students
                                                      assigned
                                                      to this
                                                      Block.
                                                    </p>
                                                  ) : (
                                                    <div
                                                      style={{
                                                        display:
                                                          "grid",
                                                        gap: 8,
                                                      }}
                                                    >
                                                      {sectionStudents.map(
                                                        ({
                                                          user,
                                                          studentProfile,
                                                        }) => (
                                                          <div
                                                            key={
                                                              user.id
                                                            }
                                                            style={{
                                                              padding:
                                                                "11px 12px",
                                                              border:
                                                                "1px solid var(--line)",
                                                              borderRadius:
                                                                9,
                                                              display:
                                                                "flex",
                                                              alignItems:
                                                                "center",
                                                              justifyContent:
                                                                "space-between",
                                                              gap: 12,
                                                              background:
                                                                "rgba(255,255,255,.015)",
                                                            }}
                                                          >
                                                            <div
                                                              style={{
                                                                display:
                                                                  "flex",
                                                                alignItems:
                                                                  "center",
                                                                gap: 10,
                                                                minWidth:
                                                                  0,
                                                              }}
                                                            >
                                                              <div className="user-avatar">
                                                                {getInitials(
                                                                  user.full_name ||
                                                                    user.email ||
                                                                    "S"
                                                                )}
                                                              </div>

                                                              <div
                                                                style={{
                                                                  minWidth:
                                                                    0,
                                                                }}
                                                              >
                                                                <strong
                                                                  style={{
                                                                    display:
                                                                      "block",
                                                                  }}
                                                                >
                                                                  {user.full_name ||
                                                                    "Unnamed Student"}
                                                                </strong>

                                                                <span
                                                                  className="muted"
                                                                  style={{
                                                                    display:
                                                                      "block",
                                                                    marginTop:
                                                                      3,
                                                                    fontSize:
                                                                      10,
                                                                  }}
                                                                >
                                                                  Student
                                                                  ID:{" "}
                                                                  {
                                                                    studentProfile.student_id
                                                                  }
                                                                </span>

                                                                <span
                                                                  className="muted"
                                                                  style={{
                                                                    display:
                                                                      "block",
                                                                    marginTop:
                                                                      2,
                                                                    fontSize:
                                                                      10,
                                                                  }}
                                                                >
                                                                  {user.email ||
                                                                    "No email"}
                                                                </span>
                                                              </div>
                                                            </div>

                                                            <StatusBadge
                                                              status={
                                                                user.account_status
                                                              }
                                                            />
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </details>
                                            );
                                          }
                                        )
                                      )}
                                    </div>
                                  </details>
                                );
                              }
                            )
                          )}
                        </div>
                      </details>
                    );
                  }
                )}
              </div>
            )}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   USER ACCOUNT CARD
   ========================================================= */

function UserAccountCard({
  user,
  assignments,
  departments,
}: {
  user: UserRow;
  assignments: SchedulerAssignment[];
  departments: Department[];
}) {
  return (
    <article className="user-card">
      <div className="user-card-main">
        <div className="user-identity">
          <div className="user-avatar">
            {getInitials(
              user.full_name ||
                user.email ||
                "U"
            )}
          </div>

          <div className="user-details">
            <div className="user-name-row">
              <h3>
                {user.full_name ||
                  "Unnamed User"}
              </h3>

              <RoleBadge
                role={user.role}
              />

              <StatusBadge
                status={
                  user.account_status
                }
              />
            </div>

            <p className="user-email">
              {user.email ||
                "No email address"}
            </p>

            <p className="user-id">
              ID: {user.id}
            </p>
          </div>
        </div>

        <div className="user-actions">
          {user.account_status ===
            "pending" && (
            <>
              <form
                action={
                  approveUser
                }
              >
                <input
                  type="hidden"
                  name="profile_id"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="user-btn user-btn-success"
                >
                  Approve
                </button>
              </form>

              <form
                action={
                  rejectUser
                }
              >
                <input
                  type="hidden"
                  name="profile_id"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="user-btn user-btn-danger"
                >
                  Reject
                </button>
              </form>
            </>
          )}

          {user.account_status ===
            "approved" &&
            user.role !==
              "super_admin" && (
              <form
                action={
                  suspendUser
                }
              >
                <input
                  type="hidden"
                  name="profile_id"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="user-btn user-btn-warning"
                >
                  Suspend
                </button>
              </form>
            )}
        </div>
      </div>

      {/* ===================================================
          FACULTY → SCHEDULER
      =================================================== */}

      {user.role ===
        "faculty" &&
        user.account_status ===
          "approved" && (
          <div className="scheduler-box">
            <div className="scheduler-box-head">
              <div>
                <span className="section-kicker">
                  SCHEDULER ACCESS
                </span>

                <h4>
                  Scheduler Authorization
                </h4>

                <p>
                  Promote this approved
                  Faculty member to
                  Department Scheduler.
                </p>
              </div>

              <form
                action={
                  promoteToDepartmentScheduler
                }
              >
                <input
                  type="hidden"
                  name="profile_id"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="user-btn user-btn-primary"
                >
                  Promote to Scheduler
                </button>
              </form>
            </div>
          </div>
        )}

      {/* ===================================================
          SCHEDULER DEPARTMENT ACCESS
      =================================================== */}

      {user.role ===
        "department_scheduler" &&
        user.account_status ===
          "approved" && (
          <div className="scheduler-box">
            <div className="scheduler-box-head">
              <div>
                <span className="section-kicker">
                  DEPARTMENT ACCESS
                </span>

                <h4>
                  Department Scheduler
                </h4>

                <p>
                  Assign one or more
                  Departments that this
                  Scheduler can manage.
                </p>
              </div>

              <form
                action={
                  demoteSchedulerToFaculty
                }
              >
                <input
                  type="hidden"
                  name="profile_id"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="user-btn user-btn-danger-soft"
                >
                  Demote to Faculty
                </button>
              </form>
            </div>

            <form
              action={
                assignSchedulerDepartment
              }
              className="department-assign-form"
            >
              <div className="field-group">
                <label
                  htmlFor={`department-${user.id}`}
                >
                  Assign Department
                </label>

                <select
                  id={`department-${user.id}`}
                  name="department_id"
                  required
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {department.code
                          ? `${department.code} — ${department.name}`
                          : department.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="submit"
                className="user-btn user-btn-primary"
              >
                Assign Department
              </button>
            </form>

            <div className="assigned-departments">
              <span className="assigned-title">
                ASSIGNED DEPARTMENTS
              </span>

              {assignments.length ===
              0 ? (
                <p className="assigned-empty">
                  No department assigned
                  yet.
                </p>
              ) : (
                <div className="department-tags">
                  {assignments.map(
                    (assignment) => {
                      const department =
                        departments.find(
                          (item) =>
                            item.id ===
                            assignment.department_id
                        );

                      return (
                        <form
                          key={
                            assignment.id
                          }
                          action={
                            revokeSchedulerDepartment
                          }
                        >
                          <input
                            type="hidden"
                            name="assignment_id"
                            value={
                              assignment.id
                            }
                          />

                          <button
                            type="submit"
                            className="department-tag"
                            title="Remove department assignment"
                          >
                            <span>
                              {department?.code ||
                                department?.name ||
                                "Department"}
                            </span>

                            <b>
                              ×
                            </b>
                          </button>
                        </form>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      <footer className="user-card-footer">
        <span>
          Registered
        </span>

        <strong>
          {formatDate(
            user.created_at
          )}
        </strong>
      </footer>
    </article>
  );
}

/* =========================================================
   FILTER LINK
   ========================================================= */

function FilterLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`filter-tab ${
        active
          ? "filter-tab-active"
          : ""
      }`}
    >
      {label}
    </a>
  );
}

/* =========================================================
   ROLE BADGE
   ========================================================= */

function RoleBadge({
  role,
}: {
  role: UserRole;
}) {
  const labels: Record<
    UserRole,
    string
  > = {
    super_admin:
      "Super Admin",

    department_scheduler:
      "Department Scheduler",

    faculty:
      "Faculty",

    student:
      "Student",
  };

  return (
    <Badge tone="info">
      {labels[role]}
    </Badge>
  );
}

/* =========================================================
   STATUS BADGE
   ========================================================= */

function StatusBadge({
  status,
}: {
  status: AccountStatus;
}) {
  const tones: Record<
    AccountStatus,
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
  > = {
    pending:
      "warning",

    approved:
      "success",

    rejected:
      "danger",

    suspended:
      "danger",

    inactive:
      "default",
  };

  return (
    <Badge tone={tones[status]}>
      {status}
    </Badge>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function getAcademicYearName(
  value:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null
) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return (
      value[0]?.name ?? ""
    );
  }

  return value.name ?? "";
}

function getInitials(
  value: string
) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}

function formatDate(
  value: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function getAccountActionError(error: string) {
  const messages: Record<string, string> = {
    missing_profile: "The selected account could not be identified.",
    user_lookup_failed: "The account could not be loaded.",
    user_not_found: "The selected account no longer exists.",
    protected_admin: "Super Admin accounts cannot be modified here.",
    student_profile_lookup_failed: "The Student profile could not be validated.",
    student_profile_missing: "This Student account does not have a Student profile.",
    student_profile_incomplete: "Complete the Student ID, Department, Program, Year Level, and Block before approval.",
    invalid_student_program: "The Student's selected Program is invalid or inactive.",
    invalid_student_department: "The Student's Department does not match the selected Program.",
    invalid_student_year_level: "The Student's Year Level is invalid for the selected Program.",
    invalid_student_section: "The Student's Block is invalid for the selected Year Level.",
    faculty_profile_lookup_failed: "The Faculty profile could not be validated.",
    faculty_profile_missing: "This Faculty account does not have a Faculty profile.",
    faculty_profile_incomplete: "Complete the Faculty Employee ID and Department before approval.",
    invalid_faculty_department: "The Faculty Department is invalid or inactive.",
    approved_failed: "The account could not be approved.",
    rejected_failed: "The account could not be rejected.",
    suspended_failed: "The account could not be suspended.",
    update_not_allowed: "The database did not allow this account update.",
  };

  return messages[error] ?? "The account action could not be completed.";
}

function getAccountActionSuccess(success: string) {
  const messages: Record<string, string> = {
    approved: "The account has been approved successfully.",
    rejected: "The account has been rejected.",
    suspended: "The account has been suspended.",
  };

  return messages[success] ?? "The account was updated successfully.";
}

