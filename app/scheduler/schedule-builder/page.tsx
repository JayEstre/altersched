import { BlockScheduleBrowser } from '@/components/block-schedule-browser'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge } from '@/components/ui'
import { GenerateForm } from './GenerateForm'
import SchedulePreview, { type PreviewEntry } from './SchedulePreview'
import { one } from '@/lib/relations'
import { formatDate, isRevisionNote } from '@/lib/format'
import { loadBookings } from '@/lib/bookings'
import { loadSchedulingSettings } from '@/lib/scheduling/settings'
import styles from './page.module.css'

type SearchParams = Promise<{
  success?: string
  error?: string
  count?: string
  schedules?: string
  entries?: string

  // IMPORTANT:
  // /scheduler/schedules uses this to open one exact draft.
  schedule?: string
}>

export default async function Page({ searchParams }: { searchParams?: SearchParams }) {
  /* =======================================================
     SECURITY
     ======================================================= */

  await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const params = searchParams ? await searchParams : {}
  const requestedScheduleId = params.schedule?.trim() || null

  /* =======================================================
     BASE DATA
     ======================================================= */

  const [
    semestersResult,
    programsResult,
    schedulesResult,
    roomsResult,
    facultyResult,
    qualificationsResult,
  ] = await Promise.all([
    supabase
      .from('semesters')
      .select(
        `
        id,
        name,
        academic_year_id,
        start_date,
        end_date,
        is_active,
        academic_years(
          id,
          name
        )
      `
      )
      .order('start_date', {
        ascending: false,
      }),
    supabase
      .from('programs')
      .select(
        `
        id,
        code,
        name,
        department_id,
        is_active
      `
      )
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('schedules')
      .select(
        `
        id,
        title,
        status,
        updated_at,
        semester_id,
        current_version_id,
        sections(
          code
        ),
        programs(
          code
        ),
        semesters(
          name
        ),
        schedule_versions!schedule_versions_schedule_id_fkey(
          id,
          version_number,
          status,
          change_reason,
          created_at,
          published_at
        )
      `
      )
      .order('updated_at', {
        ascending: false,
      }),
    supabase
      .from('rooms')
      .select(
        `
        id,
        code,
        name,
        capacity,
        room_type_id,
        is_active
      `
      )
      .eq('is_active', true)
      .order('code'),
    supabase.from('faculty_profiles').select(`
        id,
        profiles(
          id,
          full_name,
          account_status
        )
      `),
    supabase.from('faculty_subjects').select(`
        faculty_id,
        subject_id
      `),
  ])

  /* =======================================================
     BASIC DATA
     ======================================================= */

  const semesters = semestersResult.data ?? []

  const programs = (programsResult.data ?? []).filter(
    (program) =>
      String(program.code ?? '')
        .trim()
        .toUpperCase() === 'BSIT'
  )

  const schedules = schedulesResult.data ?? []
  const activeSemester = semesters.find((semester) => semester.is_active)

  /* =======================================================
     ROOMS
     ======================================================= */

  const activeRooms = (roomsResult.data ?? []).map((room) => ({
    id: room.id,
    code: room.code ?? room.name ?? 'Room',
    name: room.name ?? room.code ?? 'Room',
    capacity: Number(room.capacity ?? 0),
    room_type_id: room.room_type_id ?? null,
  }))

  /* =======================================================
     FACULTY QUALIFICATIONS
     ======================================================= */

  const qualificationMap = new Map<string, string[]>()

  for (const qualification of qualificationsResult.data ?? []) {
    const current = qualificationMap.get(qualification.faculty_id) ?? []

    if (!current.includes(qualification.subject_id)) {
      current.push(qualification.subject_id)
    }

    qualificationMap.set(qualification.faculty_id, current)
  }

  const facultyOptions = (facultyResult.data ?? [])
    .map((faculty) => {
      const profile = one(faculty.profiles)

      if (!profile) {
        return null
      }

      if (profile.account_status && profile.account_status !== 'approved') {
        return null
      }

      return {
        id: faculty.id,
        name: profile.full_name ?? 'Unnamed Instructor',
        subject_ids: qualificationMap.get(faculty.id) ?? [],
      }
    })
    .filter(Boolean) as Array<{
    id: string
    name: string
    subject_ids: string[]
  }>

  /* =======================================================
     DRAFT SCHEDULES
     ======================================================= */

  const draftSchedules = schedules.filter(
    (schedule) => schedule.status === 'draft' && schedule.current_version_id
  )

  /* =======================================================
     SELECT EXACT WORKSPACE
     Priority:
     1. ?schedule=<id>
     2. Latest visible Draft
     ======================================================= */

  let selectedSchedule: (typeof draftSchedules)[number] | null = null
  let invalidRequestedSchedule = false

  if (requestedScheduleId) {
    selectedSchedule =
      draftSchedules.find((schedule) => schedule.id === requestedScheduleId) ?? null

    if (!selectedSchedule) {
      invalidRequestedSchedule = true
    }
  } else {
    selectedSchedule = draftSchedules[0] ?? null
  }

  const selectedVersion = selectedSchedule
    ? ((selectedSchedule.schedule_versions ?? []).find(
        (version) => version.id === selectedSchedule?.current_version_id
      ) ?? null)
    : null

  const isRevisedDraft = isRevisionNote(selectedVersion?.change_reason)

  /* =======================================================
     LOAD ONLY SELECTED DRAFT ENTRIES
     ======================================================= */

  let previewEntries: (PreviewEntry & { year_level: number })[] = []
  let previewError: string | null = null

  if (selectedSchedule && selectedVersion && selectedVersion.status === 'draft') {
    const { data: entryData, error: entryError } = await supabase
      .from('schedule_entries')
      .select(
        `
        id,
        schedule_version_id,
        class_offering_id,
        faculty_id,
        section_id,
        room_id,
        day_of_week,
        start_time,
        end_time,
        entry_type,
        session_type,
        delivery_mode,
        class_offerings(
          id,
          subject_id,
          expected_students,
          subjects(
            id,
            code,
            name,
            default_room_type_id
          )
        ),
        sections(
          id,
          code,
          name,
          year_levels(level_number)
        ),
        rooms(
          id,
          code,
          name
        ),
        faculty_profiles(
          id,
          profiles(
            id,
            full_name
          )
        )
      `
      )
      .eq('schedule_version_id', selectedVersion.id)
      .order('day_of_week', {
        ascending: true,
      })
      .order('start_time', {
        ascending: true,
      })

    if (entryError) {
      previewError = entryError.message
    } else {
      previewEntries = (entryData ?? []).map((entry) => {
        const offering = one(entry.class_offerings)
        const subject = one(offering?.subjects)
        const section = one(entry.sections)
        const room = one(entry.rooms)
        const faculty = one(entry.faculty_profiles)
        const profile = one(faculty?.profiles)

        return {
          id: entry.id,
          schedule_version_id: entry.schedule_version_id,
          class_offering_id: entry.class_offering_id,
          faculty_id: entry.faculty_id ?? null,
          section_id: entry.section_id,
          room_id: entry.room_id,
          day_of_week: Number(entry.day_of_week),
          start_time: entry.start_time,
          end_time: entry.end_time,
          entry_type: entry.entry_type,
          session_type: entry.session_type,
          delivery_mode: entry.delivery_mode,
          subject_id: offering?.subject_id ?? subject?.id ?? '',
          subject_code: subject?.code ?? '—',
          subject_name: subject?.name ?? 'Unknown Subject',
          section_code: section?.code ?? '—',
          section_name: section?.name ?? section?.code ?? 'Block',
          year_level: Number(
            one<{ level_number: number }>(section?.year_levels)?.level_number ?? 0
          ),
          expected_students: Number(offering?.expected_students ?? 0),
          required_room_type_id: subject?.default_room_type_id ?? null,
          faculty_name: profile?.full_name ?? 'Unassigned',
          room_code: room?.code ?? room?.name ?? 'Room',
        }
      })
    }
  }

  // Year levels come from the authoritative section -> year_level relationship (never from a block code).
  const sectionYears = new Map<string, number>()
  for (const entry of previewEntries) {
    const level = Number(entry.year_level ?? 0)
    if (level >= 1 && level <= 4) sectionYears.set(String(entry.section_id), level)
  }

  const schedulingSettings = await loadSchedulingSettings(supabase)

  // Other blocks' sessions in the same semester, so the editor can flag room/instructor clashes.
  const bookings =
    selectedSchedule && selectedVersion && previewEntries.length
      ? await loadBookings(supabase, selectedSchedule.semester_id, [selectedVersion.id])
      : []

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <div className={styles.scope}>
      <PageHead
        title="Schedule Builder"
        description="Generate the timetable for every block, then open a draft to check and adjust it before submitting."
      />
      {/* ===================================================
          TOP NAVIGATION
          =================================================== */}
      {/* ===================================================
          GENERATOR MESSAGE
          =================================================== */}
      <GeneratorMessage
        success={params.success}
        error={params.error}
        count={params.count}
        schedules={params.schedules}
        entries={params.entries}
      />
      {/* ===================================================
          INVALID SCHEDULE
          =================================================== */}
      {invalidRequestedSchedule && (
        <div className="portal-alert portal-alert-danger">
          <strong>Draft unavailable.</strong>
          <span>
            The requested schedule does not exist, is no longer a Draft, or is outside your
            authorized scheduling scope.
          </span>
        </div>
      )}
      {previewError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Schedule preview unavailable.</strong>
          <span>{previewError}</span>
        </div>
      )}
      {/* ===================================================
          GENERATOR
          =================================================== */}
      <section className="panel builder-generator">
        <div className="builder-section-head">
          <div>
            <h3>Generate BSIT Schedule</h3>
            <p>
              Create new conflict-aware Draft schedules from the configured BSIT class offerings.
            </p>
          </div>
          <Badge>BSIT</Badge>
        </div>
        <GenerateForm>
          <div className="generator-field">
            <label htmlFor="semester_id">Semester</label>
            <select
              id="semester_id"
              name="semester_id"
              required
              defaultValue={activeSemester?.id ?? ''}
            >
              {!activeSemester && (
                <option value="" disabled>
                  Select semester
                </option>
              )}
              {semesters.map((semester) => {
                const academicYear = one(semester.academic_years)

                return (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                    {academicYear?.name ? ` — ${academicYear.name}` : ''}
                    {semester.is_active ? ' (Active)' : ''}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="generator-field">
            <label htmlFor="program_id">Generation Scope</label>
            <select id="program_id" name="program_id" defaultValue="all">
              <option value="all">BSIT — Department Schedule</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code}
                  {' — '}
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className="generator-field">
            <label htmlFor="title">Generation Name</label>
            <input id="title" name="title" type="text" placeholder="Schedule title (optional)" />
          </div>
          <div className="generator-info">
            <strong>Automatic constraints</strong>
            <span>
              Faculty qualification and availability, teaching load, room requirements, room
              capacity, block conflicts, faculty conflicts, and room conflicts are checked during
              generation.
            </span>
          </div>
        </GenerateForm>
      </section>
      {/* ===================================================
          DRAFT SELECTOR
          =================================================== */}
      <section className="panel builder-drafts">
        <div className="builder-section-head">
          <div>
            <h3>Open Draft</h3>
            <p>
              Select one Draft at a time. Entries from different schedules are never mixed in the
              editor.
            </p>
          </div>
          <Link href="/scheduler/schedules" className="btn btn-outline">
            View All
          </Link>
        </div>
        {draftSchedules.length ? (
          <div className="draft-grid">
            {draftSchedules.map((schedule) => {
              const program = one(schedule.programs)
              const section = one(schedule.sections)
              const semester = one(schedule.semesters)

              const version = (schedule.schedule_versions ?? []).find(
                (item) => item.id === schedule.current_version_id
              )

              const revised = isRevisionNote(version?.change_reason)
              const selected = schedule.id === selectedSchedule?.id

              return (
                <Link
                  key={schedule.id}
                  href={`/scheduler/schedule-builder?schedule=${schedule.id}`}
                  className={`draft-card${selected ? ' selected' : ''}`}
                >
                  <div className="draft-card-head">
                    <strong>{schedule.title || 'Untitled Schedule'}</strong>
                    <Badge>{revised ? 'Revised' : 'Draft'}</Badge>
                  </div>
                  <span>
                    {program?.code || 'BSIT'}
                    {' / '}
                    {section?.code || '—'}
                  </span>
                  <span>{semester?.name || '—'}</span>
                  <span>Version {version?.version_number ?? '—'}</span>
                  {revised && version?.change_reason && <small>{version.change_reason}</small>}
                </Link>
              )
            })}
          </div>
        ) : (
          <Empty title="No working Drafts" text="Generate the first BSIT schedule to begin." />
        )}
      </section>
      {/* ===================================================
          CURRENT WORKSPACE
          =================================================== */}
      <section className="panel builder-workspace">
        <div className="builder-workspace-head">
          <div>
            <h2>
              {selectedSchedule
                ? selectedSchedule.title || 'Untitled Schedule'
                : 'No Draft Selected'}
            </h2>
            {selectedSchedule && selectedVersion && (
              <p>
                Working on Version {selectedVersion.version_number}
                {' · '}
                {isRevisedDraft ? 'Revised Draft' : 'Generated Draft'}
                {' · Updated '}
                {formatDate(selectedSchedule.updated_at)}
              </p>
            )}
          </div>
          {selectedSchedule && selectedVersion && (
            <div className="builder-workspace-badges">
              <Badge tone="warning">Draft</Badge>
              <Badge>{isRevisedDraft ? 'Revised Draft' : 'Generated Draft'}</Badge>
            </div>
          )}
        </div>
        {isRevisedDraft && selectedVersion?.change_reason && (
          <div className="builder-revision-note">
            <strong>Revision Reason</strong>
            <span>{selectedVersion.change_reason}</span>
          </div>
        )}
      </section>
      {/* ===================================================
          EXACT DRAFT PREVIEW
          =================================================== */}
      {selectedSchedule && selectedVersion && previewEntries.length > 0 ? (
        <SchedulePreview
          entries={previewEntries}
          faculty={facultyOptions}
          rooms={activeRooms}
          bookings={bookings}
          teachingDays={schedulingSettings.days}
        />
      ) : selectedSchedule && selectedVersion ? (
        <section className="panel builder-empty">
          <Empty
            title="Draft has no entries"
            text="This Draft does not currently contain timetable entries."
          />
        </section>
      ) : (
        <section className="panel builder-empty">
          <Empty
            title="No editable Draft"
            text="Generate a BSIT schedule or open a Draft from the Schedules page."
          />
        </section>
      )}
      <section className="panel">
        <h3>Draft timetables</h3>
        <p className="muted">
          Pick a year and a block to see its week. Each subject has its own colour.
        </p>
        {previewEntries.length > 0 ? (
          <BlockScheduleBrowser
            entries={previewEntries.map((entry) => ({
              id: String(entry.id),
              year: sectionYears.get(String(entry.section_id)) ?? 0,
              block: String(entry.section_code ?? 'Unknown block'),
              subject: `${entry.subject_code ?? ''} — ${entry.subject_name ?? ''}`,
              faculty: String(entry.faculty_name ?? 'Unassigned'),
              room: String(entry.room_code ?? 'Unassigned'),
              day: Number(entry.day_of_week),
              start: String(entry.start_time ?? ''),
              end: String(entry.end_time ?? ''),
            }))}
          />
        ) : (
          <p className="muted">Generate a schedule to see it here.</p>
        )}
      </section>
    </div>
  )
}

/* =========================================================
   GENERATOR MESSAGE
   ========================================================= */

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
        <strong>Master schedule generated.</strong>
        <span>
          AlterSched created {schedules ?? '0'} Draft schedule(s) containing {entries ?? '0'}{' '}
          timetable entries. Open the Draft workspace below to review and edit it before Admin
          review.
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
      text: 'Select a Semester before generating the schedule.',
    },
    semester_not_found: {
      title: 'Semester unavailable',
      text: 'The selected Semester could not be found.',
    },
    program_not_found: {
      title: 'Program unavailable',
      text: 'The selected BSIT Program could not be found.',
    },
    program_load_failed: {
      title: 'Program unavailable',
      text: 'AlterSched could not load the BSIT Program.',
    },
    no_programs: {
      title: 'BSIT Program unavailable',
      text: 'An active BSIT Program is required before generation.',
    },
    structure_load_failed: {
      title: 'Academic structure unavailable',
      text: 'AlterSched could not load the Year Levels.',
    },
    no_year_levels: {
      title: 'No Year Levels',
      text: 'BSIT has no configured Year Levels.',
    },
    section_load_failed: {
      title: 'Blocks unavailable',
      text: 'AlterSched could not load the active Blocks.',
    },
    no_sections: {
      title: 'No active Blocks',
      text: 'BSIT requires at least one active Block before generation.',
    },
    offerings_load_failed: {
      title: 'Class Offerings unavailable',
      text: 'AlterSched could not load the Class Offerings.',
    },
    no_class_offerings: {
      title: 'No Class Offerings',
      text: 'There are no active BSIT Class Offerings for the selected Semester.',
    },
    no_qualified_faculty: {
      title: 'Qualified Instructor needed',
      text: 'At least one subject has no qualified Instructor. Configure Faculty Qualifications before generating again.',
    },
    faculty_load_exceeded: {
      title: 'Teaching Load exceeded',
      text: 'All qualified Instructors for at least one subject have reached their configured teaching-load limit.',
    },
    faculty_assignment_failed: {
      title: 'Instructor assignment failed',
      text: 'AlterSched could not automatically assign eligible Instructors.',
    },
    offering_prepare_failed: {
      title: 'Class Offering preparation failed',
      text: 'AlterSched could not prepare the active BSIT Class Offerings.',
    },
    no_rooms: {
      title: 'No usable rooms',
      text: 'At least one active room is required before automatic generation.',
    },
    faculty_availability_failed: {
      title: 'Instructor availability unavailable',
      text: 'AlterSched could not load Instructor availability.',
    },
    room_availability_failed: {
      title: 'Room availability unavailable',
      text: 'AlterSched could not load Room availability.',
    },
    no_schedulable_hours: {
      title: 'No schedulable hours',
      text: 'The Class Offerings do not contain usable Lecture, Laboratory, or weekly-hour requirements.',
    },
    unplaced_sessions: {
      title: 'Some sessions cannot be placed',
      text: `${count ?? 'Some'} required session(s) could not be placed without violating the scheduling constraints. No partial schedule was saved. Try more teaching days or longer hours (Admin → Settings → Schedule Generator), more rooms, or wider instructor availability.`,
    },
    schedule_lookup_failed: {
      title: 'Schedule lookup failed',
      text: 'AlterSched could not check the existing BSIT schedule.',
    },
    schedule_create_failed: {
      title: 'Schedule creation failed',
      text: 'AlterSched could not create one of the Draft schedules.',
    },
    version_lookup_failed: {
      title: 'Schedule version lookup failed',
      text: 'AlterSched could not determine the latest schedule version.',
    },
    version_create_failed: {
      title: 'Version creation failed',
      text: 'AlterSched could not create the new Draft schedule version.',
    },
    entries_create_failed: {
      title: 'Timetable save failed',
      text: 'Generated timetable entries could not be saved.',
    },
    current_version_failed: {
      title: 'Version linking failed',
      text: 'A generated version could not be linked as the current Draft version.',
    },
  }

  const message = messages[error] ?? {
    title: 'Generation failed',
    text: 'AlterSched encountered an unexpected error while generating the schedule.',
  }

  return (
    <div className="portal-alert portal-alert-danger">
      <strong>{message.title}</strong>
      <span>{message.text}</span>
    </div>
  )
}
