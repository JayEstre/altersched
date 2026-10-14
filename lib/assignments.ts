import type { SupabaseClient } from '@supabase/supabase-js'

import { describeBooking, findClash, loadBookings } from '@/lib/bookings'
import { one } from '@/lib/relations'

/**
 * Instructor assignment service.
 *
 * An instructor is assigned to a *class offering* (one subject for one block), which covers
 * all of its lecture and lab sessions. The schedule generator assigns instructors automatically
 * ("auto"); the Super Admin or the Department Scheduler can change any assignment ("manual").
 * Changing it also updates the sessions of the block's current draft schedule
 * (database function public.assign_offering_instructor).
 */

export type AssignmentMode = 'auto' | 'manual'

export type InstructorOption = {
  id: string
  name: string
  employeeId: string | null
  maxLoad: number
  load: number
}

export type AssignmentRow = {
  offeringId: string
  semesterId: string
  sectionId: string
  /** Year level number (1–4), 0 when unknown. */
  yearNumber: number
  subjectId: string
  subjectCode: string
  subjectName: string
  blockCode: string
  yearLevel: string
  hours: number
  expectedStudents: number | null
  status: string
  facultyId: string | null
  facultyName: string | null
  mode: AssignmentMode | null
  candidates: InstructorOption[]
}

type Session = { day_of_week: number; start_time: string; end_time: string }

/** Loads every active class offering of a semester with its qualified instructors and their loads. */
export async function loadAssignmentRows(
  supabase: SupabaseClient,
  semesterId: string | null
): Promise<AssignmentRow[]> {
  if (!semesterId) return []

  const [offeringsResult, facultyResult, qualificationsResult] = await Promise.all([
    supabase
      .from('class_offerings')
      .select(
        `id, semester_id, section_id, subject_id, faculty_id, assignment_mode, required_weekly_hours,
         expected_students, status,
         subjects(code, name),
         sections(code, year_levels(name, level_number))`
      )
      .eq('semester_id', semesterId)
      .eq('status', 'active'),
    supabase
      .from('faculty_profiles')
      .select('id, employee_id, max_teaching_load, profiles(full_name, account_status)'),
    supabase.from('faculty_subjects').select('faculty_id, subject_id'),
  ])

  for (const result of [offeringsResult, facultyResult, qualificationsResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const offerings = offeringsResult.data ?? []

  const load = new Map<string, number>()
  for (const offering of offerings) {
    if (!offering.faculty_id) continue
    load.set(
      offering.faculty_id,
      (load.get(offering.faculty_id) ?? 0) + Number(offering.required_weekly_hours ?? 0)
    )
  }

  const instructors = new Map<string, InstructorOption>()
  for (const faculty of facultyResult.data ?? []) {
    const profile = one<{ full_name: string | null; account_status: string | null }>(
      faculty.profiles
    )
    if (profile?.account_status && profile.account_status !== 'approved') continue
    instructors.set(faculty.id, {
      id: faculty.id,
      name: profile?.full_name || faculty.employee_id || 'Instructor',
      employeeId: faculty.employee_id ?? null,
      maxLoad: Number(faculty.max_teaching_load ?? 0),
      load: load.get(faculty.id) ?? 0,
    })
  }

  const qualifiedBySubject = new Map<string, InstructorOption[]>()
  for (const q of qualificationsResult.data ?? []) {
    const instructor = instructors.get(q.faculty_id)
    if (!instructor) continue
    const list = qualifiedBySubject.get(q.subject_id) ?? []
    list.push(instructor)
    qualifiedBySubject.set(q.subject_id, list)
  }

  return offerings
    .map((offering): AssignmentRow => {
      const subject = one<{ code: string; name: string }>(offering.subjects)
      const section = one<{ code: string; year_levels: unknown }>(offering.sections)
      const year = one<{ name: string; level_number: number }>(section?.year_levels as never)
      const candidates = [...(qualifiedBySubject.get(offering.subject_id) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      return {
        offeringId: offering.id,
        semesterId: offering.semester_id,
        sectionId: offering.section_id,
        yearNumber: Number(year?.level_number ?? 0),
        subjectId: offering.subject_id,
        subjectCode: subject?.code ?? '—',
        subjectName: subject?.name ?? '',
        blockCode: section?.code ?? '—',
        yearLevel: year?.name ?? '',
        hours: Number(offering.required_weekly_hours ?? 0),
        expectedStudents: offering.expected_students ?? null,
        status: offering.status,
        facultyId: offering.faculty_id,
        facultyName: offering.faculty_id
          ? (instructors.get(offering.faculty_id)?.name ?? 'Instructor')
          : null,
        mode: offering.faculty_id
          ? ((offering.assignment_mode as AssignmentMode | null) ?? 'auto')
          : null,
        candidates,
      }
    })
    .sort(
      (a, b) =>
        a.yearLevel.localeCompare(b.yearLevel) ||
        a.blockCode.localeCompare(b.blockCode) ||
        a.subjectCode.localeCompare(b.subjectCode)
    )
}

/**
 * Returns a readable description of the first time clash the instructor would have if they
 * took over this offering's sessions, or null when there is none. Compares against the
 * current versions of the schedules of the same semester, except `excludeVersionIds`
 * (a draft being edited is checked by the editor and by the database).
 */
export async function findInstructorClash(
  supabase: SupabaseClient,
  facultyId: string,
  offeringId: string,
  sessions?: Session[],
  excludeVersionIds: string[] = []
): Promise<string | null> {
  const { data: offering } = await supabase
    .from('class_offerings')
    .select('semester_id')
    .eq('id', offeringId)
    .maybeSingle()
  if (!offering) return null

  const bookings = await loadBookings(supabase, offering.semester_id, excludeVersionIds)
  const mine =
    sessions ??
    bookings
      .filter((booking) => booking.offeringId === offeringId)
      .map((booking) => ({
        day_of_week: booking.day,
        start_time: booking.start,
        end_time: booking.end,
      }))

  for (const session of mine) {
    const clash = findClash(
      { ...session, class_offering_id: offeringId, faculty_id: facultyId },
      bookings
    )
    if (clash) return `already teaches ${describeBooking(clash.booking)}`
  }
  return null
}

/** Assigns (or clears, with null) the instructor of a class offering. */
export async function assignInstructor(
  supabase: SupabaseClient,
  offeringId: string,
  facultyId: string | null,
  mode: AssignmentMode = 'manual'
): Promise<{ ok: true; sessionsUpdated: number } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('assign_offering_instructor', {
    p_offering_id: offeringId,
    p_faculty_id: facultyId,
    p_mode: mode,
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true, sessionsUpdated: Number(data ?? 0) }
}
