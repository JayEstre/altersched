/**
 * Automatic instructor assignment (pure logic, no database access).
 *
 * For every class offering without an instructor, pick a qualified instructor who stays
 * within their maximum teaching load:
 *   1. the subject's default instructor (Subject Catalog), when qualified and within load;
 *   2. otherwise the qualified instructor with the lowest current load.
 * Offerings with no qualified instructor, or where everyone is at full load, stay unassigned.
 * Offerings that already have an instructor (auto or manual) are never changed.
 */

export type AssignableOffering = {
  id: string
  subject_id: string
  faculty_id: string | null
  required_weekly_hours: number | string
}

export type QualifiedInstructor = {
  id: string
  /** Maximum weekly teaching hours; 0 or less means no limit. */
  maxLoad: number
}

export type InstructorAssignment = { offeringId: string; facultyId: string }

export function chooseInstructors(
  offerings: AssignableOffering[],
  qualifiedBySubject: Map<string, QualifiedInstructor[]>,
  currentLoad: Map<string, number>,
  defaultBySubject: Map<string, string> = new Map()
): InstructorAssignment[] {
  const load = new Map(currentLoad)
  const assignments: InstructorAssignment[] = []

  for (const offering of offerings) {
    if (offering.faculty_id) continue

    const hours = Number(offering.required_weekly_hours ?? 0)
    const withinLoad = (qualifiedBySubject.get(offering.subject_id) ?? [])
      .filter(
        (candidate) =>
          candidate.maxLoad <= 0 || (load.get(candidate.id) ?? 0) + hours <= candidate.maxLoad
      )
      .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))

    if (!withinLoad.length) continue

    const preferredId = defaultBySubject.get(offering.subject_id)
    const chosen = withinLoad.find((candidate) => candidate.id === preferredId) ?? withinLoad[0]

    assignments.push({ offeringId: offering.id, facultyId: chosen.id })
    load.set(chosen.id, (load.get(chosen.id) ?? 0) + hours)
  }

  return assignments
}
