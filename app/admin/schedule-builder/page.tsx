import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import {
  PageHead,
  Stat,
  Empty,
  Badge,
} from '@/components/ui'

import { generateMasterSchedule } from './actions'

type SearchParams = Promise<{
  success?: string
  error?: string
  count?: string
  schedules?: string
  entries?: string
}>

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const supabase = await createClient()

  const params = searchParams
    ? await searchParams
    : {}

  const [
    semestersResult,
    programsResult,
    schedulesResult,
    offeringsResult,
    roomsResult,
    conflictsResult,
  ] = await Promise.all([
    supabase
      .from('semesters')
      .select(`
        id,
        name,
        academic_year_id,
        start_date,
        end_date,
        is_active,
        academic_years (
          id,
          name
        )
      `)
      .order('start_date', {
        ascending: false,
      }),

    supabase
      .from('programs')
      .select(`
        id,
        code,
        name,
        department_id,
        is_active
      `)
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('schedules')
      .select(`
        id,
        title,
        status,
        updated_at,
        sections(code),
        programs(code),
        semesters(name),
        schedule_versions(
          id,
          version_number,
          status,
          published_at
        )
      `)
      .order('updated_at', {
        ascending: false,
      })
      .limit(10),

    supabase
      .from('class_offerings')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('rooms')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true),

    supabase
      .from('schedule_validation_logs')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('resolved', false),
  ])

  const semesters =
    semestersResult.data ?? []

  const programs =
    programsResult.data ?? []

  const schedules =
    schedulesResult.data ?? []

  const activeSemester =
    semesters.find(
      (semester: any) =>
        semester.is_active
    )

  return (
    <>
      <PageHead
        eyebrow="MASTER SCHEDULING"
        title="Automatic Schedule Generator"
        description="Generate conflict-aware draft schedules automatically across programs, year levels, blocks, faculty, rooms, and available time slots."
      />

      <div className="stats-grid">
        <Stat
          label="Class Offerings"
          value={
            offeringsResult.count ?? 0
          }
        />

        <Stat
          label="Active Rooms"
          value={roomsResult.count ?? 0}
        />

        <Stat
          label="Programs"
          value={programs.length}
        />

        <Stat
          label="Unresolved Conflicts"
          value={
            conflictsResult.count ?? 0
          }
        />
      </div>

      <GeneratorMessage
        success={params.success}
        error={params.error}
        count={params.count}
        schedules={params.schedules}
        entries={params.entries}
      />

      <div className="master-builder-layout">
        {/* =====================================
            MASTER GENERATOR
        ====================================== */}

        <section className="panel master-generator-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">
                AUTOMATIC GENERATION
              </span>

              <h3>
                Generate Master Schedule
              </h3>

              <p>
                Select the semester and scope.
                AlterSched will automatically
                schedule all eligible Class
                Offerings without manually
                choosing every block, room,
                day, or time.
              </p>
            </div>
          </div>

          <div className="panel-body">
            <form
              action={generateMasterSchedule}
              className="master-generator-form"
            >
              {/* SEMESTER */}

              <div className="master-generator-field">
                <div className="master-field-head">
                  <div>
                    <label htmlFor="semester_id">
                      Semester
                    </label>

                    <p>
                      Academic term to generate
                      schedules for.
                    </p>
                  </div>

                  {activeSemester && (
                    <Badge tone="success">
                      Active Semester Available
                    </Badge>
                  )}
                </div>

                <select
                  id="semester_id"
                  name="semester_id"
                  required
                  defaultValue={
                    activeSemester?.id ?? ''
                  }
                >
                  {!activeSemester && (
                    <option
                      value=""
                      disabled
                    >
                      Select semester
                    </option>
                  )}

                  {semesters.map(
                    (semester: any) => {
                      const relation =
                        semester.academic_years

                      const academicYear =
                        Array.isArray(
                          relation
                        )
                          ? relation[0]
                          : relation

                      return (
                        <option
                          key={semester.id}
                          value={semester.id}
                        >
                          {semester.name}
                          {academicYear?.name
                            ? ` — ${academicYear.name}`
                            : ''}
                          {semester.is_active
                            ? ' (Active)'
                            : ''}
                        </option>
                      )
                    }
                  )}
                </select>
              </div>

              {/* SCOPE */}

              <div className="master-generator-field">
                <div className="master-field-head">
                  <div>
                    <label htmlFor="program_id">
                      Generation Scope
                    </label>

                    <p>
                      Generate the entire school
                      or only one Program.
                    </p>
                  </div>
                </div>

                <select
                  id="program_id"
                  name="program_id"
                  defaultValue="all"
                >
                  <option value="all">
                    All Programs — Master
                    Schedule
                  </option>

                  {programs.map(
                    (program: any) => (
                      <option
                        key={program.id}
                        value={program.id}
                      >
                        {program.code} —{' '}
                        {program.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* OPTIONAL TITLE */}

              <div className="master-generator-field">
                <div className="master-field-head">
                  <div>
                    <label htmlFor="title">
                      Generation Name
                    </label>

                    <p>
                      Optional label for this
                      generation run.
                    </p>
                  </div>
                </div>

                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Schedule title (optional)"
                />
              </div>

              {/* AUTOMATION INFO */}

              <div className="master-auto-box">
                <div className="master-auto-icon">
                  A
                </div>

                <div>
                  <strong>
                    AlterSched handles the
                    scheduling automatically
                  </strong>

                  <p>
                    You do not need to manually
                    select every Department,
                    Year Level, Block, room,
                    day, or class time.
                  </p>
                </div>
              </div>

              <div className="master-generator-actions">
                <Link
                  href="/admin/class-offerings"
                  className="action"
                >
                  Review Class Offerings
                </Link>

                <button
                  type="submit"
                  className="action primary master-generate-button"
                >
                  Generate Master Schedule
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* =====================================
            ENGINE RULES
        ====================================== */}

        <aside className="master-builder-side">
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  GENERATOR ENGINE
                </span>

                <h3>
                  Automatic Rules
                </h3>

                <p>
                  Constraints checked during
                  generation.
                </p>
              </div>
            </div>

            <div className="panel-body">
              <div className="master-rule-list">
                <GeneratorRule
                  number="01"
                  title="Faculty Conflict"
                  text="A faculty member cannot teach overlapping classes."
                />

                <GeneratorRule
                  number="02"
                  title="Block Conflict"
                  text="A student block cannot have two classes at the same time."
                />

                <GeneratorRule
                  number="03"
                  title="Room Conflict"
                  text="A room cannot be assigned to simultaneous classes."
                />

                <GeneratorRule
                  number="04"
                  title="Room Capacity"
                  text="The selected room must accommodate the expected class size."
                />

                <GeneratorRule
                  number="05"
                  title="Availability"
                  text="Unavailable faculty periods and blocked rooms are excluded."
                />

                <GeneratorRule
                  number="06"
                  title="Lecture & Lab"
                  text="Lecture and laboratory hours are scheduled as separate meeting requirements."
                />
              </div>
            </div>
          </section>

          <section className="panel master-flow-panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  WORKFLOW
                </span>

                <h3>
                  After Generation
                </h3>
              </div>
            </div>

            <div className="panel-body">
              <div className="master-flow">
                <FlowItem
                  number="1"
                  title="Generate"
                  text="Create conflict-aware draft schedules."
                />

                <FlowItem
                  number="2"
                  title="Review"
                  text="Inspect the generated timetable."
                />

                <FlowItem
                  number="3"
                  title="Validate"
                  text="Resolve remaining validation issues."
                />

                <FlowItem
                  number="4"
                  title="Publish"
                  text="Release the approved schedule."
                />
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* =====================================
          RECENT GENERATED SCHEDULES
      ====================================== */}

      <section className="panel master-recent">
        <div className="panel-header">
          <div>
            <span className="section-kicker">
              GENERATED SCHEDULES
            </span>

            <h3>Recent Drafts</h3>

            <p>
              Generated schedules stay in Draft
              status until reviewed and
              published.
            </p>
          </div>

          <Link
            href="/admin/schedules"
            className="action"
          >
            View All Schedules
          </Link>
        </div>

        <div className="panel-body">
          {schedules.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Schedule</th>
                    <th>Program</th>
                    <th>Block</th>
                    <th>Semester</th>
                    <th>Version</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map(
                    (schedule: any) => {
                      const versions =
                        schedule.schedule_versions ??
                        []

                      const latest =
                        [...versions].sort(
                          (
                            a: any,
                            b: any
                          ) =>
                            Number(
                              b.version_number
                            ) -
                            Number(
                              a.version_number
                            )
                        )[0]

                      return (
                        <tr key={schedule.id}>
                          <td>
                            <strong className="table-primary">
                              {schedule.title ||
                                'Untitled Schedule'}
                            </strong>
                          </td>

                          <td>
                            {schedule
                              .programs?.[0]
                              ?.code ?? '—'}
                          </td>

                          <td>
                            {schedule
                              .sections?.[0]
                              ?.code ?? '—'}
                          </td>

                          <td>
                            {schedule
                              .semesters?.[0]
                              ?.name ?? '—'}
                          </td>

                          <td>
                            {latest
                              ? `v${latest.version_number}`
                              : '—'}
                          </td>

                          <td>
                            <Badge
                              tone={
                                schedule.status ===
                                'published'
                                  ? 'success'
                                  : schedule.status ===
                                      'approved'
                                    ? 'info'
                                    : schedule.status ===
                                        'submitted'
                                      ? 'warning'
                                      : 'default'
                              }
                            >
                              {schedule.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No generated schedules yet." />
          )}
        </div>
      </section>
    </>
  )
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function GeneratorRule({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div className="master-rule">
      <span>{number}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

function FlowItem({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div className="master-flow-item">
      <span>{number}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

function GeneratorMessage({
  success,
  error,
  count,
  schedules,
  entries,
}: {
  success?: string
  error?: string
  count?: string
  schedules?: string
  entries?: string
}) {
  if (success === 'master_generated') {
    return (
      <div className="portal-alert portal-alert-success">
        <strong>
          Master schedule generated.
        </strong>

        <span>
          AlterSched created{' '}
          {schedules ?? '0'} draft
          schedule(s) containing{' '}
          {entries ?? '0'} timetable
          entries. Review them before
          publication.
        </span>
      </div>
    )
  }

  if (!error) {
    return null
  }

  const messages: Record<
    string,
    {
      title: string
      text: string
    }
  > = {
    semester_required: {
      title: 'Semester required',
      text:
        'Select a Semester before generating the Master Schedule.',
    },

    semester_not_found: {
      title: 'Semester unavailable',
      text:
        'The selected Semester could not be found.',
    },

    program_not_found: {
      title: 'Program unavailable',
      text:
        'The selected Program could not be found.',
    },

    program_load_failed: {
      title: 'Programs unavailable',
      text:
        'AlterSched could not load the Programs.',
    },

    no_programs: {
      title: 'No active Programs',
      text:
        'At least one active Program is required.',
    },

    structure_load_failed: {
      title: 'Academic structure unavailable',
      text:
        'AlterSched could not load the Year Levels.',
    },

    no_year_levels: {
      title: 'No Year Levels',
      text:
        'The selected scheduling scope has no Year Levels.',
    },

    section_load_failed: {
      title: 'Blocks unavailable',
      text:
        'AlterSched could not load the active Blocks.',
    },

    no_sections: {
      title: 'No active Blocks',
      text:
        'The selected scheduling scope has no active Blocks.',
    },

    offerings_load_failed: {
      title: 'Class Offerings unavailable',
      text:
        'AlterSched could not load the Class Offerings.',
    },

    no_class_offerings: {
      title: 'No Class Offerings',
      text:
        'There are no Class Offerings for the selected Semester and Program scope.',
    },

    no_qualified_faculty: {
      title: 'Qualified Faculty needed',
      text: 'At least one subject has no eligible Faculty. Add the subject under Faculty Qualifications, then generate again.',
    },

    faculty_assignment_failed: {
      title: 'Automatic Faculty assignment failed',
      text: 'AlterSched could not assign eligible Faculty automatically. Check Faculty qualifications and teaching-load limits.',
    },

    offering_prepare_failed: {
      title: 'Automatic Class Offering preparation failed',
      text: 'AlterSched could not prepare Class Offerings from the active curriculum.',
    },

    no_active_curricula: {
      title: 'No active Curriculum',
      text: 'The selected Program scope needs an active Curriculum before schedule generation.',
    },

    no_curriculum_subjects: {
      title: 'Curriculum has no subjects for this Semester',
      text: 'Map subjects to the correct Year Level and Semester before generating.',
    },

    invalid_semester_term: {
      title: 'Semester setup incomplete',
      text: 'The selected Semester does not have a valid term order.',
    },

    no_rooms: {
      title: 'No usable rooms',
      text:
        'At least one active room is required before automatic generation.',
    },

    faculty_availability_failed: {
      title: 'Faculty availability unavailable',
      text:
        'AlterSched could not load Faculty availability.',
    },

    room_availability_failed: {
      title: 'Room availability unavailable',
      text:
        'AlterSched could not load Room availability.',
    },

    no_schedulable_hours: {
      title: 'No schedulable hours',
      text:
        'The Class Offerings do not contain usable lecture, laboratory, or weekly-hour requirements.',
    },

    unplaced_sessions: {
      title: 'Some sessions cannot be placed',
      text: `${count ?? 'Some'} required session(s) could not be placed without violating the current constraints. No partial Master Schedule was saved.`,
    },

    schedule_create_failed: {
      title: 'Schedule creation failed',
      text:
        'AlterSched could not create one of the draft schedule records.',
    },

    version_create_failed: {
      title: 'Version creation failed',
      text:
        'AlterSched could not create Version 1 for one of the schedules.',
    },

    entries_create_failed: {
      title: 'Timetable save failed',
      text:
        'Generated timetable entries could not be saved.',
    },

    current_version_failed: {
      title: 'Version linking failed',
      text:
        'A generated version could not be linked as the current schedule version.',
    },
  }

  const message =
    messages[error] ?? {
      title: 'Generation failed',
      text:
        'AlterSched encountered an unexpected error while generating the Master Schedule.',
    }

  return (
    <div className="portal-alert portal-alert-danger">
      <strong>{message.title}</strong>
      <span>{message.text}</span>
    </div>
  )
}