/** Data shapes used by the automatic schedule generator (lib/scheduling). */

export type Offering = {
  id: string
  semester_id: string
  section_id: string
  subject_id: string
  faculty_id: string | null
  required_weekly_hours: number | string
  expected_students: number | null
  status: string
  curriculum_required_room_type_id?: string | null
  subjects?: SubjectSummary | SubjectSummary[] | null
  sections?: SectionSummary | SectionSummary[] | null
}

export type SubjectSummary = {
  id?: string
  code?: string
  name?: string
  units?: number | string | null
  lecture_hours?: number | string | null
  lab_hours?: number | string | null
  default_room_type_id?: string | null
  [key: string]: unknown
}

export type SectionSummary = {
  id?: string
  code?: string
  name?: string
  [key: string]: unknown
}

export type FacultyAvailabilityRecord = {
  faculty_id: string
  day_of_week: number | string
  availability_type?: string
  start_time: string
  end_time: string
}

export type RoomAvailabilityRecord = {
  room_id: string
  day_of_week: number | string
  status?: string
  start_time: string
  end_time: string
}

export type Room = {
  id: string
  code: string
  name: string
  capacity: number
  room_type_id: string | null
}

export type GeneratedEntry = {
  class_offering_id: string
  faculty_id: string | null
  section_id: string
  room_id: string
  day_of_week: number
  start_time: string
  end_time: string
  entry_type: 'lecture' | 'lab'
}

export type SessionRequirement = {
  offering: Offering
  entryType: 'lecture' | 'lab'
  durationMinutes: number
  expectedStudents: number
  requiredRoomTypeId: string | null
}
