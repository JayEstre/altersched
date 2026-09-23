import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

import {
  createAcademicYear,
  createDepartment,
  createProgram,
  createSection,
  createSemester,
  createYearLevel,
  setAcademicEntityActive,
  setAcademicYearActive,
  setSemesterActive,
} from "./actions";

type SearchParams = Promise<{
  success?: string;
  error?: string;
}>;

type Institution = {
  id: string;
  name: string;
  short_name: string | null;
  is_active: boolean;
};

type AcademicYear = {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type Semester = {
  id: string;
  academic_year_id: string;
  name: string;
  term_order: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type Department = {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type Program = {
  id: string;
  department_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type YearLevel = {
  id: string;
  program_id: string;
  level_number: number;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type Section = {
  id: string;
  year_level_id: string;
  code: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
};

const successMessages: Record<string, string> = {
  academic_year_created: "Academic Year created successfully.",
  academic_year_activated: "Active Academic Year updated.",
  semester_created: "Semester created successfully.",
  semester_activated: "Active Semester updated.",
  department_created: "Department created successfully.",
  program_created: "Program created successfully.",
  year_level_created: "Year Level created successfully.",
  section_created: "Block / Section created successfully.",
  academic_entity_activated: "Academic record activated.",
  academic_entity_deactivated: "Academic record deactivated.",
};

const errorMessages: Record<string, string> = {
  academic_year_fields_required:
    "Complete all required Academic Year fields.",
  academic_year_invalid_dates:
    "Academic Year end date must be later than its start date.",
  institution_not_found: "Institution could not be found.",
  institution_inactive: "The selected institution is inactive.",
  academic_year_exists:
    "An Academic Year with that name already exists.",
  academic_year_check_failed:
    "Unable to verify the Academic Year.",
  academic_year_create_failed:
    "Unable to create the Academic Year.",
  academic_year_required: "Select an Academic Year.",
  academic_year_not_found: "Academic Year could not be found.",
  academic_year_activation_failed:
    "Unable to change the active Academic Year.",

  semester_fields_required:
    "Complete all required Semester fields.",
  semester_invalid_term_order:
    "Semester term order must be greater than zero.",
  semester_invalid_dates:
    "Semester end date must be later than its start date.",
  semester_outside_academic_year:
    "Semester dates must fall within the selected Academic Year.",
  semester_exists:
    "That Semester already exists in the selected Academic Year.",
  semester_check_failed: "Unable to verify the Semester.",
  semester_create_failed: "Unable to create the Semester.",
  semester_required: "Select a Semester.",
  semester_not_found: "Semester could not be found.",
  semester_academic_year_invalid:
    "Semester Academic Year information is invalid.",
  semester_activation_failed:
    "Unable to change the active Semester.",

  department_fields_required:
    "Institution, Department Code and Department Name are required.",
  department_check_failed: "Unable to verify the Department.",
  department_code_exists:
    "That Department Code already exists.",
  department_create_failed:
    "Unable to create the Department.",
  department_not_found: "Department could not be found.",
  department_inactive: "The selected Department is inactive.",

  program_fields_required:
    "Department, Program Code and Program Name are required.",
  program_check_failed: "Unable to verify the Program.",
  program_code_exists: "That Program Code already exists.",
  program_create_failed: "Unable to create the Program.",
  program_not_found: "Program could not be found.",
  program_inactive: "The selected Program is inactive.",

  year_level_fields_required:
    "Program, Level Number and Year Level Name are required.",
  year_level_invalid_number:
    "Year Level Number must be greater than zero.",
  year_level_invalid_sort_order:
    "Year Level sort order must be greater than zero.",
  year_level_check_failed: "Unable to verify the Year Level.",
  year_level_exists: "That Year Level already exists.",
  year_level_create_failed:
    "Unable to create the Year Level.",
  year_level_not_found: "Year Level could not be found.",
  year_level_inactive: "The selected Year Level is inactive.",

  section_fields_required:
    "Year Level, Block Code and Block Name are required.",
  section_invalid_capacity:
    "Block capacity must be greater than zero.",
  section_check_failed:
    "Unable to verify the Block / Section.",
  section_code_exists: "That Block Code already exists.",
  section_create_failed:
    "Unable to create the Block / Section.",

  invalid_academic_entity: "Invalid academic record.",
  academic_entity_update_failed:
    "Unable to update the academic record.",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function Status({
  active,
  activeText = "Active",
}: {
  active: boolean;
  activeText?: string;
}) {
  return (
    <span className={active ? "pill pill-success" : "pill"}>
      {active ? activeText : "Inactive"}
    </span>
  );
}

function AcademicEntityToggle({
  entity,
  id,
  active,
}: {
  entity: "department" | "program" | "year_level" | "section";
  id: string;
  active: boolean;
}) {
  return (
    <form action={setAcademicEntityActive}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="active"
        value={active ? "false" : "true"}
      />

      <button type="submit" className="btn btn-outline">
        {active ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}

export default async function AcademicSetupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["super_admin"]);

  const params = await searchParams;
  const supabase = await createClient();

  const [
    institutionsResult,
    academicYearsResult,
    semestersResult,
    departmentsResult,
    programsResult,
    yearLevelsResult,
    sectionsResult,
  ] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name, short_name, is_active")
      .order("name"),

    supabase
      .from("academic_years")
      .select(
        "id, institution_id, name, start_date, end_date, is_active"
      )
      .order("start_date", { ascending: false }),

    supabase
      .from("semesters")
      .select(
        "id, academic_year_id, name, term_order, start_date, end_date, is_active"
      )
      .order("term_order"),

    supabase
      .from("departments")
      .select(
        "id, institution_id, code, name, description, is_active"
      )
      .order("code"),

    supabase
      .from("programs")
      .select(
        "id, department_id, code, name, description, is_active"
      )
      .order("code"),

    supabase
      .from("year_levels")
      .select(
        "id, program_id, level_number, name, sort_order, is_active"
      )
      .order("sort_order"),

    supabase
      .from("sections")
      .select(
        "id, year_level_id, code, name, capacity, is_active"
      )
      .order("code"),
  ]);

  const queryError =
    institutionsResult.error ||
    academicYearsResult.error ||
    semestersResult.error ||
    departmentsResult.error ||
    programsResult.error ||
    yearLevelsResult.error ||
    sectionsResult.error;

  if (queryError) {
    console.error("Academic Setup load error:", queryError);

    return (
      <section className="stack-lg">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Academic Structure</p>
            <h1>Academic Setup</h1>
            <p className="muted">
              Manage the academic structure used by AlterSched.
            </p>
          </div>
        </div>

        <div className="alert alert-error">
          Unable to load Academic Setup: {queryError.message}
        </div>
      </section>
    );
  }

  const institutions =
    (institutionsResult.data ?? []) as Institution[];

  const academicYears =
    (academicYearsResult.data ?? []) as AcademicYear[];

  const semesters =
    (semestersResult.data ?? []) as Semester[];

  const departments =
    (departmentsResult.data ?? []) as Department[];

  const programs =
    (programsResult.data ?? []) as Program[];

  const yearLevels =
    (yearLevelsResult.data ?? []) as YearLevel[];

  const sections =
    (sectionsResult.data ?? []) as Section[];

  const activeInstitutions = institutions.filter(
    (item) => item.is_active
  );

  const activeDepartments = departments.filter(
    (item) => item.is_active
  );

  const activePrograms = programs.filter(
    (item) => item.is_active
  );

  const activeYearLevels = yearLevels.filter(
    (item) => item.is_active
  );

  const activeSections = sections.filter(
    (item) => item.is_active
  );

  const activeAcademicYear = academicYears.find(
    (item) => item.is_active
  );

  const activeSemester = semesters.find(
    (item) => item.is_active
  );

  const successMessage = params.success
    ? successMessages[params.success] ??
      "Academic Setup updated successfully."
    : null;

  const errorMessage = params.error
    ? errorMessages[params.error] ??
      "Academic Setup could not be updated."
    : null;

  return (
    <section className="stack-lg">
      {/* HEADER */}

      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic Structure</p>
          <h1>Academic Setup</h1>

          <p className="muted">
            Manage the Academic Calendar and the Department →
            Program → Year Level → Block structure used by
            AlterSched.
          </p>
        </div>
      </div>

      {/* MESSAGES */}

      {successMessage ? (
        <div className="alert alert-success">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="alert alert-error">
          {errorMessage}
        </div>
      ) : null}

      {/* STATS */}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Academic Years</span>
          <strong className="stat-value">
            {academicYears.length}
          </strong>
          <small className="stat-hint">
            {activeAcademicYear
              ? `Active: ${activeAcademicYear.name}`
              : "No active academic year"}
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Semesters</span>
          <strong className="stat-value">
            {semesters.length}
          </strong>
          <small className="stat-hint">
            {activeSemester
              ? `Active: ${activeSemester.name}`
              : "No active semester"}
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Departments</span>
          <strong className="stat-value">
            {departments.length}
          </strong>
          <small className="stat-hint">
            {activeDepartments.length} active
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Programs</span>
          <strong className="stat-value">
            {programs.length}
          </strong>
          <small className="stat-hint">
            {activePrograms.length} active
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Year Levels</span>
          <strong className="stat-value">
            {yearLevels.length}
          </strong>
          <small className="stat-hint">
            {activeYearLevels.length} active
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Blocks / Sections
          </span>
          <strong className="stat-value">
            {sections.length}
          </strong>
          <small className="stat-hint">
            {activeSections.length} active
          </small>
        </div>
      </div>

      {/* ACADEMIC YEARS */}

      <section className="panel academic-section">
        <div className="academic-section-head">
          <div>
            <p className="section-kicker">
              Academic Calendar
            </p>
            <h2>Academic Years</h2>
            <p className="muted">
              Define the official academic year used by
              semesters and scheduling operations.
            </p>
          </div>

          <span className="academic-head-count">
            {academicYears.length} Total
          </span>
        </div>

        <div className="academic-section-body">
          <form
            action={createAcademicYear}
            className="academic-create-row"
          >
            <div className="academic-field">
              <label>Institution</label>

              <select
                name="institution_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select institution
                </option>

                {activeInstitutions.map((institution) => (
                  <option
                    key={institution.id}
                    value={institution.id}
                  >
                    {institution.short_name
                      ? `${institution.short_name} — ${institution.name}`
                      : institution.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="academic-field">
              <label>Academic Year</label>
              <input
                name="name"
                placeholder="AY 2026-2027"
                required
              />
            </div>

            <div className="academic-field">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                required
              />
            </div>

            <div className="academic-field">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Academic Year
            </button>
          </form>

          <div className="academic-calendar-list">
            {academicYears.length === 0 ? (
              <div className="academic-no-structure">
                No academic years configured.
              </div>
            ) : (
              academicYears.map((year) => {
                const yearSemesters = semesters.filter(
                  (semester) =>
                    semester.academic_year_id === year.id
                );

                return (
                  <article
                    key={year.id}
                    className="calendar-card"
                  >
                    <div className="calendar-card-top">
                      <div>
                        <span className="calendar-label">
                          Academic Year
                        </span>

                        <div className="calendar-title-row">
                          <h3>{year.name}</h3>

                          <Status
                            active={year.is_active}
                            activeText="Active Year"
                          />
                        </div>

                        <p className="muted">
                          {formatDate(year.start_date)} —{" "}
                          {formatDate(year.end_date)}
                        </p>
                      </div>

                      {!year.is_active ? (
                        <form action={setAcademicYearActive}>
                          <input
                            type="hidden"
                            name="academic_year_id"
                            value={year.id}
                          />

                          <button
                            type="submit"
                            className="btn btn-outline"
                          >
                            Set Active
                          </button>
                        </form>
                      ) : null}
                    </div>

                    <div className="semester-card-grid">
                      {yearSemesters.length === 0 ? (
                        <div className="academic-no-structure">
                          No semesters under this academic
                          year.
                        </div>
                      ) : (
                        yearSemesters.map((semester) => (
                          <div
                            key={semester.id}
                            className="semester-card"
                          >
                            <div className="semester-card-head">
                              <div>
                                <strong>
                                  {semester.name}
                                </strong>

                                <small>
                                  Term {semester.term_order}
                                </small>
                              </div>

                              <Status
                                active={semester.is_active}
                                activeText="Active Semester"
                              />
                            </div>

                            <p className="muted">
                              {formatDate(
                                semester.start_date
                              )}{" "}
                              —{" "}
                              {formatDate(
                                semester.end_date
                              )}
                            </p>

                            {!semester.is_active ? (
                              <form action={setSemesterActive}>
                                <input
                                  type="hidden"
                                  name="semester_id"
                                  value={semester.id}
                                />

                                <button
                                  type="submit"
                                  className="btn btn-outline"
                                >
                                  Set Active
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* CREATE SEMESTER */}

      <section className="panel academic-section">
        <div className="academic-section-head">
          <div>
            <p className="section-kicker">
              Academic Calendar
            </p>

            <h2>Create Semester</h2>

            <p className="muted">
              Add a semester under an existing academic year.
            </p>
          </div>

          <span className="academic-head-count">
            {semesters.length} Total
          </span>
        </div>

        <div className="academic-section-body">
          <form
            action={createSemester}
            className="semester-create-row"
          >
            <div className="academic-field">
              <label>Academic Year</label>

              <select
                name="academic_year_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select academic year
                </option>

                {academicYears.map((year) => (
                  <option
                    key={year.id}
                    value={year.id}
                  >
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="academic-field">
              <label>Semester</label>
              <input
                name="name"
                placeholder="1st Semester"
                required
              />
            </div>

            <div className="academic-field">
              <label>Term Order</label>
              <input
                type="number"
                name="term_order"
                min="1"
                placeholder="1"
                required
              />
            </div>

            <div className="academic-field">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                required
              />
            </div>

            <div className="academic-field">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Semester
            </button>
          </form>
        </div>
      </section>

      {/* DEPARTMENTS */}

      <section className="panel academic-section">
        <div className="academic-section-head">
          <div>
            <p className="section-kicker">
              Academic Structure
            </p>

            <h2>Departments</h2>

            <p className="muted">
              Manage the academic departments under the
              institution.
            </p>
          </div>

          <span className="academic-head-count">
            {activeDepartments.length} Active
          </span>
        </div>

        <div className="academic-section-body">
          <form
            action={createDepartment}
            className="academic-create-row"
          >
            <div className="academic-field">
              <label>Institution</label>

              <select
                name="institution_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select institution
                </option>

                {activeInstitutions.map((institution) => (
                  <option
                    key={institution.id}
                    value={institution.id}
                  >
                    {institution.short_name
                      ? `${institution.short_name} — ${institution.name}`
                      : institution.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="academic-field">
              <label>Department Code</label>
              <input
                name="code"
                placeholder="e.g. CCS"
                required
              />
            </div>

            <div className="academic-field">
              <label>Department Name</label>
              <input
                name="name"
                placeholder="Department name"
                required
              />
            </div>

            <div className="academic-field">
              <label>Description</label>
              <input
                name="description"
                placeholder="Optional description"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Department
            </button>
          </form>

          {departments.length === 0 ? (
            <div className="academic-no-structure">
              No departments configured.
            </div>
          ) : (
            <div className="department-grid">
              {departments.map((department) => {
                const departmentPrograms = programs.filter(
                  (program) =>
                    program.department_id ===
                    department.id
                );

                return (
                  <article
                    key={department.id}
                    className="department-card"
                  >
                    <div className="department-card-icon">
                      {department.code
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="department-card-content">
                      <div className="department-card-title">
                        <div>
                          <strong>
                            {department.code}
                          </strong>

                          <h3>
                            {department.name}
                          </h3>
                        </div>

                        <Status
                          active={department.is_active}
                        />
                      </div>

                      <p className="muted">
                        {department.description ||
                          `${departmentPrograms.length} Program${
                            departmentPrograms.length === 1
                              ? ""
                              : "s"
                          } configured`}
                      </p>

                      <div className="department-card-footer">
                        <span>
                          {departmentPrograms.length}{" "}
                          Program
                          {departmentPrograms.length === 1
                            ? ""
                            : "s"}
                        </span>

                        <AcademicEntityToggle
                          entity="department"
                          id={department.id}
                          active={department.is_active}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* PROGRAMS */}

      <section className="panel academic-section">
        <div className="academic-section-head">
          <div>
            <p className="section-kicker">
              Academic Structure
            </p>

            <h2>Programs</h2>

            <p className="muted">
              Manage programs under their respective
              departments.
            </p>
          </div>

          <span className="academic-head-count">
            {activePrograms.length} Active
          </span>
        </div>

        <div className="academic-section-body">
          <form
            action={createProgram}
            className="academic-create-row"
          >
            <div className="academic-field">
              <label>Department</label>

              <select
                name="department_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select department
                </option>

                {activeDepartments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.code} —{" "}
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="academic-field">
              <label>Program Code</label>
              <input
                name="code"
                placeholder="e.g. BSIT"
                required
              />
            </div>

            <div className="academic-field">
              <label>Program Name</label>
              <input
                name="name"
                placeholder="Program name"
                required
              />
            </div>

            <div className="academic-field">
              <label>Description</label>
              <input
                name="description"
                placeholder="Optional description"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Program
            </button>
          </form>

          {programs.length === 0 ? (
            <div className="academic-no-structure">
              No programs configured.
            </div>
          ) : (
            <div className="academic-program-grid">
              {programs.map((program) => {
                const department = departments.find(
                  (item) =>
                    item.id === program.department_id
                );

                const programYears = yearLevels.filter(
                  (year) =>
                    year.program_id === program.id
                );

                const programSections = sections.filter(
                  (section) =>
                    programYears.some(
                      (year) =>
                        year.id ===
                        section.year_level_id
                    )
                );

                return (
                  <article
                    key={program.id}
                    className="academic-program-card"
                  >
                    <div className="academic-program-head">
                      <div className="academic-program-identity">
                        <span className="academic-program-code">
                          {program.code}
                        </span>

                        <div>
                          <h3>{program.name}</h3>

                          <span className="academic-program-department">
                            {department
                              ? `${department.code} — ${department.name}`
                              : "Department unavailable"}
                          </span>
                        </div>
                      </div>

                      <Status
                        active={program.is_active}
                      />
                    </div>

                    {program.description ? (
                      <p className="muted">
                        {program.description}
                      </p>
                    ) : null}

                    <div className="academic-program-summary">
                      <span>
                        {programYears.length} Year Levels
                      </span>

                      <span>
                        {programSections.length} Blocks
                      </span>
                    </div>

                    <div className="academic-program-footer">
                      <AcademicEntityToggle
                        entity="program"
                        id={program.id}
                        active={program.is_active}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* YEAR LEVELS */}

      <section className="panel academic-section">
        <div className="academic-section-head">
          <div>
            <p className="section-kicker">
              Academic Structure
            </p>

            <h2>Year Levels</h2>

            <p className="muted">
              Add and manage year levels under each program.
            </p>
          </div>

          <span className="academic-head-count">
            {activeYearLevels.length} Active
          </span>
        </div>

        <div className="academic-section-body">
          <form
            action={createYearLevel}
            className="academic-create-row"
          >
            <div className="academic-field">
              <label>Program</label>

              <select
                name="program_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select program
                </option>

                {activePrograms.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.code} — {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="academic-field">
              <label>Level Number</label>

              <input
                type="number"
                name="level_number"
                min="1"
                placeholder="1"
                required
              />
            </div>

            <div className="academic-field">
              <label>Year Level Name</label>

              <input
                name="name"
                placeholder="1st Year"
                required
              />
            </div>

            <div className="academic-field">
              <label>Sort Order</label>

              <input
                type="number"
                name="sort_order"
                min="1"
                placeholder="1"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Year Level
            </button>
          </form>

          <div className="academic-year-management-grid">
            {programs.map((program) => {
              const programYears = yearLevels
                .filter(
                  (year) =>
                    year.program_id === program.id
                )
                .sort(
                  (a, b) =>
                    a.sort_order - b.sort_order ||
                    a.level_number - b.level_number
                );

              if (programYears.length === 0) {
                return null;
              }

              return (
                <article
                  key={program.id}
                  className="academic-management-card"
                >
                  <div className="academic-management-head">
                    <div className="academic-management-title">
                      <strong>{program.code}</strong>
                      <span>{program.name}</span>
                    </div>

                    <span className="academic-head-count">
                      {programYears.length} Years
                    </span>
                  </div>

                  <div className="academic-management-list">
                    {programYears.map((year) => (
                      <div
                        key={year.id}
                        className="academic-management-row"
                      >
                        <div className="academic-year-info">
                          <strong>{year.name}</strong>
                        </div>

                        <Status
                          active={year.is_active}
                        />

                        <AcademicEntityToggle
                          entity="year_level"
                          id={year.id}
                          active={year.is_active}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* BLOCKS / SECTIONS */}

      <section className="panel academic-section">
        <div className="academic-section-head">
          <div>
            <p className="section-kicker">
              Academic Structure
            </p>

            <h2>Blocks / Sections</h2>

            <p className="muted">
              Add and manage blocks under the correct year
              level.
            </p>
          </div>

          <span className="academic-head-count">
            {activeSections.length} Active
          </span>
        </div>

        <div className="academic-section-body">
          <form
            action={createSection}
            className="academic-create-row"
          >
            <div className="academic-field">
              <label>Year Level</label>

              <select
                name="year_level_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select year level
                </option>

                {activeYearLevels.map((year) => {
                  const program = programs.find(
                    (item) =>
                      item.id === year.program_id
                  );

                  return (
                    <option
                      key={year.id}
                      value={year.id}
                    >
                      {program?.code
                        ? `${program.code} — `
                        : ""}
                      {year.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="academic-field">
              <label>Block Code</label>

              <input
                name="code"
                placeholder="A"
                required
              />
            </div>

            <div className="academic-field">
              <label>Block Name</label>

              <input
                name="name"
                placeholder="Block A"
                required
              />
            </div>

            <div className="academic-field">
              <label>Capacity</label>

              <input
                type="number"
                name="capacity"
                min="1"
                placeholder="Optional"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Block
            </button>
          </form>

          <div className="academic-block-management">
            {programs.map((program) => {
              const programYears = yearLevels
                .filter(
                  (year) =>
                    year.program_id === program.id
                )
                .sort(
                  (a, b) =>
                    a.sort_order - b.sort_order ||
                    a.level_number - b.level_number
                );

              if (programYears.length === 0) {
                return null;
              }

              return (
                <article
                  key={program.id}
                  className="academic-management-card"
                >
                  <div className="academic-management-head">
                    <div className="academic-management-title">
                      <strong>{program.code}</strong>
                      <span>{program.name}</span>
                    </div>
                  </div>

                  <div className="academic-block-year-list">
                    {programYears.map((year) => {
                      const yearSections = sections.filter(
                        (section) =>
                          section.year_level_id ===
                          year.id
                      );

                      return (
                        <div
                          key={year.id}
                          className="academic-block-year-row"
                        >
                          <div className="academic-block-year-title">
                            <strong>{year.name}</strong>

                            <small>
                              {yearSections.length}{" "}
                              {yearSections.length === 1
                                ? "Block"
                                : "Blocks"}
                            </small>
                          </div>

                          <div className="academic-blocks">
                            {yearSections.length === 0 ? (
                              <span className="academic-no-blocks">
                                No blocks
                              </span>
                            ) : (
                              yearSections.map((section) => (
                                <div
                                  key={section.id}
                                  className="academic-block-item"
                                >
                                  <div className="academic-block-info">
                                    <strong>
                                      {section.code}
                                    </strong>

                                    {section.name &&
                                    section.name !==
                                      section.code ? (
                                      <small>
                                        {section.name}
                                      </small>
                                    ) : null}
                                  </div>

                                  <Status
                                    active={section.is_active}
                                  />

                                  <AcademicEntityToggle
                                    entity="section"
                                    id={section.id}
                                    active={
                                      section.is_active
                                    }
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}