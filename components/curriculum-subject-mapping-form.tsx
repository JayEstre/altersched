'use client'

import { useMemo, useState } from 'react'

type Curriculum = {
  id: string
  program_id: string
  name: string
  is_active: boolean
  program?: {
    id: string
    code: string
    name: string
  } | null
}

type YearLevel = {
  id: string
  program_id: string
  name: string
}

type Subject = {
  id: string
  code: string
  name: string
  is_active: boolean
}

type RoomType = {
  id: string
  name: string
}

type Props = {
  curricula: Curriculum[]
  yearLevels: YearLevel[]
  subjects: Subject[]
  roomTypes: RoomType[]
  action: (formData: FormData) => void | Promise<void>
}

export default function CurriculumSubjectMappingForm({
  curricula,
  yearLevels,
  subjects,
  roomTypes,
  action,
}: Props) {
  const [curriculumId, setCurriculumId] = useState('')
  const [yearLevelId, setYearLevelId] = useState('')

  /* =====================================================
     SELECTED CURRICULUM
  ===================================================== */

  const selectedCurriculum = useMemo(() => {
    return (
      curricula.find(
        (curriculum) => curriculum.id === curriculumId
      ) ?? null
    )
  }, [curricula, curriculumId])

  /* =====================================================
     YEAR LEVELS FOR SELECTED PROGRAM
  ===================================================== */

  const filteredYearLevels = useMemo(() => {
    if (!selectedCurriculum) {
      return []
    }

    return yearLevels.filter(
      (yearLevel) =>
        yearLevel.program_id === selectedCurriculum.program_id
    )
  }, [yearLevels, selectedCurriculum])

  /* =====================================================
     ACTIVE SUBJECTS
  ===================================================== */

  const activeSubjects = useMemo(() => {
    return subjects.filter((subject) => subject.is_active)
  }, [subjects])

  /* =====================================================
     FORM
  ===================================================== */

  return (
    <form action={action} className="sched-form">
      <div className="sched-form-grid">

        {/* CURRICULUM */}
        <div className="sched-field">
          <label htmlFor="mapping_curriculum_id">
            Curriculum
          </label>

          <select
            id="mapping_curriculum_id"
            name="curriculum_id"
            value={curriculumId}
            onChange={(event) => {
              setCurriculumId(event.target.value)
              setYearLevelId('')
            }}
            required
          >
            <option value="" disabled>
              Select Curriculum
            </option>

            {curricula.map((curriculum) => (
              <option
                key={curriculum.id}
                value={curriculum.id}
              >
                {curriculum.program?.code
                  ? `${curriculum.program.code} — ${curriculum.name}`
                  : curriculum.name}
              </option>
            ))}
          </select>

          <small>
            Select the Program curriculum where the Subject
            will be assigned.
          </small>
        </div>

        {/* YEAR LEVEL */}
        <div className="sched-field">
          <label htmlFor="mapping_year_level_id">
            Year Level
          </label>

          <select
            id="mapping_year_level_id"
            name="year_level_id"
            value={yearLevelId}
            onChange={(event) =>
              setYearLevelId(event.target.value)
            }
            required
            disabled={!selectedCurriculum}
          >
            <option value="" disabled>
              {selectedCurriculum
                ? 'Select Year Level'
                : 'Select Curriculum First'}
            </option>

            {filteredYearLevels.map((yearLevel) => (
              <option
                key={yearLevel.id}
                value={yearLevel.id}
              >
                {yearLevel.name}
              </option>
            ))}
          </select>

          <small>
            {selectedCurriculum
              ? `Year Levels for ${
                  selectedCurriculum.program?.code ??
                  'the selected Program'
                }.`
              : 'Select a Curriculum first.'}
          </small>
        </div>

        {/* SEMESTER */}
        <div className="sched-field">
          <label htmlFor="mapping_term_order">
            Semester
          </label>

          <select
            id="mapping_term_order"
            name="term_order"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Select Semester
            </option>

            <option value="1">
              1st Semester
            </option>

            <option value="2">
              2nd Semester
            </option>
          </select>

          <small>
            Semester when this Subject belongs in the
            curriculum.
          </small>
        </div>

        {/* SUBJECT */}
        <div className="sched-field">
          <label htmlFor="mapping_subject_id">
            Subject
          </label>

          <select
            id="mapping_subject_id"
            name="subject_id"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Select Subject
            </option>

            {activeSubjects.map((subject) => (
              <option
                key={subject.id}
                value={subject.id}
              >
                {subject.code} — {subject.name}
              </option>
            ))}
          </select>

          <small>
            Select the Subject to include in this curriculum.
          </small>
        </div>

        {/* WEEKLY HOURS */}
        <div className="sched-field">
          <label htmlFor="mapping_weekly_hours">
            Weekly Hours
          </label>

          <input
            id="mapping_weekly_hours"
            name="weekly_hours"
            type="number"
            min="0.5"
            max="40"
            step="0.5"
            placeholder="Example: 3"
            required
          />

          <small>
            Total number of scheduled hours required each
            week.
          </small>
        </div>

        {/* ROOM TYPE */}
        <div className="sched-field">
          <label htmlFor="mapping_required_room_type_id">
            Required Room Type
          </label>

          <select
            id="mapping_required_room_type_id"
            name="required_room_type_id"
            defaultValue=""
          >
            <option value="">
              Any Room Type
            </option>

            {roomTypes.map((roomType) => (
              <option
                key={roomType.id}
                value={roomType.id}
              >
                {roomType.name}
              </option>
            ))}
          </select>

          <small>
            Optional. Select a required room type for
            laboratory or specialized Subjects.
          </small>
        </div>
      </div>

      {/* FORM ACTION */}
      <div className="sched-form-actions">
        <button
          type="submit"
          className="sched-primary-btn"
          disabled={
            !selectedCurriculum ||
            !yearLevelId ||
            activeSubjects.length === 0
          }
        >
          Add Subject to Curriculum
        </button>
      </div>
    </form>
  )
}