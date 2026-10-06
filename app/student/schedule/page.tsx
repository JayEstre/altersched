import Link from 'next/link'



import { requireRole } from '@/lib/auth/require-role'

import { createClient } from '@/lib/supabase/server'



import {

  PageHead,

  Badge,

  Empty,

} from '@/components/ui'
import { DataTable } from '@/components/data-table'



import {

  claimScheduleWithCode,

} from './actions'



const DAYS = [

  '',

  'Monday',

  'Tuesday',

  'Wednesday',

  'Thursday',

  'Friday',

  'Saturday',

  'Sunday',

]



function rel(value: any) {

  return Array.isArray(value)

    ? value[0]

    : value

}



function errorMessage(

  error?: string

) {

  switch (error) {

    case 'code_required':

      return 'Enter the class code provided for your schedule.'



    case 'invalid_code':

      return 'The class code is invalid, expired, revoked, or no longer active.'



    case 'account_not_approved':

      return 'Your student account must be approved before you can claim a schedule.'



    case 'student_account_required':

      return 'Only an approved student account can claim a student schedule.'



    case 'student_profile_not_found':

      return 'Your student profile could not be found.'



    case 'student_profile_incomplete':

      return 'Your student profile is incomplete. Department, Program, Year Level, and Block are required before claiming a schedule.'



    case 'student_profile_lookup_failed':

      return 'AlterSched could not load your student profile.'



    case 'department_mismatch':

      return 'This class code belongs to a different department.'



    case 'program_mismatch':

      return 'This class code belongs to a different program.'



    case 'year_level_mismatch':

      return 'This class code belongs to a different year level.'



    case 'section_mismatch':

      return 'This class code belongs to a different Block or Section.'



    case 'schedule_not_for_student':

      return 'This schedule is not assigned to your Department, Program, Year Level, or Block.'



    case 'schedule_not_published':

      return 'This schedule is not currently published.'



    case 'active_schedule_exists':

      return 'You already have an active schedule for this semester.'



    case 'membership_lookup_failed':

      return 'AlterSched could not check your current schedule membership.'



    case 'claim_confirmation_failed':

      return 'The schedule was claimed, but AlterSched could not confirm the membership.'



    case 'claim_not_completed':

      return 'The schedule was not claimed. Verify the class code and try again.'



    case 'claim_failed':

      return 'The schedule could not be claimed.'



    case 'code_resolution_failed':

      return 'AlterSched could not securely verify the class code.'



    default:

      return 'The request could not be completed.'

  }

}



function successMessage(

  success?: string

) {

  switch (success) {

    case 'schedule_claimed':

      return 'Your published class schedule is now connected to your student account.'



    case 'already_claimed':

      return 'Your active schedule is already connected to your account.'



    default:

      return null

  }

}



export default async function Page({

  searchParams,

}: {

  searchParams?: Promise<

    Record<

      string,

      string | undefined

    >

  >

}) {

  const { profile } =

    await requireRole([

      'student',

    ])



  const s =

    await createClient()



  const q = searchParams

    ? await searchParams

    : {}



  /* =======================================================

     STUDENT PROFILE

     ======================================================= */



  const {

    data: studentProfile,

    error: studentError,

  } = await s

    .from('student_profiles')

    .select(`

      id,

      student_id,

      department_id,

      program_id,

      year_level_id,

      section_id,



      departments(

        code,

        name

      ),



      programs(

        code,

        name

      ),



      year_levels(

        name

      ),



      sections(

        code

      )

    `)

    .eq(

      'profile_id',

      profile.id

    )

    .maybeSingle()



  if (studentError) {

    console.error(

      'Failed to load student profile:',

      studentError

    )

  }



  const department =

    rel(

      (studentProfile as any)

        ?.departments

    )



  const program =

    rel(

      (studentProfile as any)

        ?.programs

    )



  const yearLevel =

    rel(

      (studentProfile as any)

        ?.year_levels

    )



  const section =

    rel(

      (studentProfile as any)

        ?.sections

    )



  const profileComplete =

    Boolean(

      studentProfile?.id &&

        studentProfile?.department_id &&

        studentProfile?.program_id &&

        studentProfile?.year_level_id &&

        studentProfile?.section_id

    )



  const approved =

    profile.account_status ===

    'approved'



  /* =======================================================

     ACTIVE MEMBERSHIP

     ======================================================= */



  let membership: any = null



  if (studentProfile?.id) {

    const {

      data,

      error,

    } = await s

      .from(

        'schedule_memberships'

      )

      .select(`

        id,

        schedule_id,

        schedule_version_id,

        section_id,

        claimed_via,

        claimed_at,

        active,

        created_at

      `)

      .eq(

        'student_profile_id',

        studentProfile.id

      )

      .eq(

        'active',

        true

      )

      .order(

        'created_at',

        {

          ascending: false,

        }

      )

      .limit(1)

      .maybeSingle()



    if (error) {

      console.error(

        'Failed to load membership:',

        error

      )

    }



    membership = data

  }



  /* =======================================================

     OFFICIAL SCHEDULE



     Membership determines which schedule belongs to the

     student.



     The schedule itself must still be Published.

     ======================================================= */



  let schedule: any = null



  if (

    membership?.schedule_id

  ) {

    const {

      data,

      error,

    } = await s

      .from('schedules')

      .select(`

        id,

        title,

        status,

        current_version_id,

        semester_id,

        department_id,

        program_id,

        year_level_id,

        section_id,



        departments(

          code,

          name

        ),



        programs(

          code,

          name

        ),



        year_levels(

          name

        ),



        sections(

          code

        ),



        semesters(

          name

        )

      `)

      .eq(

        'id',

        membership.schedule_id

      )

      .maybeSingle()



    if (error) {

      console.error(

        'Failed to load schedule:',

        error

      )

    }



    schedule = data

  }



  const publishedSchedule =

    schedule?.status ===

    'published'

      ? schedule

      : null



  /* =======================================================

     VERSION SAFETY



     The active membership is the student's authorization
     boundary. Read the exact schedule_version_id recorded
     on that membership instead of automatically switching
     to schedules.current_version_id.

     A later controlled publication must update the
     membership before the student is switched to a new
     schedule version.

     ======================================================= */



  const versionId =

    publishedSchedule &&

    membership?.schedule_version_id

      ? membership.schedule_version_id

      : null



  /* =======================================================

     SCHEDULE ENTRIES

     ======================================================= */



  let entries: any[] = []



  if (

    publishedSchedule &&

    versionId

  ) {

    const {

      data,

      error,

    } = await s

      .from(

        'schedule_entries'

      )

      .select(`

        id,

        day_of_week,

        start_time,

        end_time,

        entry_type,



        class_offerings(

          subjects(

            code,

            name

          )

        ),



        faculty_profiles(

          employee_id,

          profiles(

            full_name

          )

        ),



        rooms(

          code,

          name

        )

      `)

      .eq(

        'schedule_version_id',

        versionId

      )

      .eq(

        'section_id',

        studentProfile?.section_id || ''

      )

      .order(

        'day_of_week',

        {

          ascending: true,

        }

      )

      .order(

        'start_time',

        {

          ascending: true,

        }

      )



    if (error) {

      console.error(

        'Failed to load schedule entries:',

        error

      )

    }



    entries =

      data ?? []

  }



  /* =======================================================

     RELATIONS

     ======================================================= */



  const hasSchedule =

    Boolean(

      membership &&

        publishedSchedule &&

        versionId

    )



  const versionOutOfSync =

    Boolean(

      publishedSchedule &&

        membership?.schedule_version_id &&

        publishedSchedule.current_version_id &&

        membership.schedule_version_id !==

          publishedSchedule.current_version_id

    )



  const scheduleDepartment =

    rel(

      publishedSchedule

        ?.departments

    )



  const scheduleProgram =

    rel(

      publishedSchedule

        ?.programs

    )



  const scheduleYearLevel =

    rel(

      publishedSchedule

        ?.year_levels

    )



  const scheduleSection =

    rel(

      publishedSchedule

        ?.sections

    )



  const semester =

    rel(

      publishedSchedule

        ?.semesters

    )



  const success =

    successMessage(

      q.success

    )



  /* =======================================================

     PAGE

     ======================================================= */



  return (

    <>

      <PageHead

        eyebrow="MY SCHEDULE"

        title={

          hasSchedule

            ? publishedSchedule

                ?.title ||

              'Class Schedule'

            : 'Get My Schedule'

        }

        description={

          hasSchedule

            ? 'Your official published class timetable in AlterSched.'

            : 'Enter the class code assigned to your Department, Program, Year Level, and Block.'

        }

      />



      {/* ===================================================

          NAVIGATION

          =================================================== */}



      <div className="student-schedule-nav">

        <Link

          href="/student/dashboard"

          className="user-btn"

        >

          ← Dashboard

        </Link>



        {hasSchedule && (

          <Badge tone="success">

            Published

          </Badge>

        )}

      </div>



      {/* ===================================================

          ERROR

          =================================================== */}



      {q.error && (

        <div className="portal-alert portal-alert-danger">

          <strong>

            Schedule access failed.

          </strong>



          <span>

            {errorMessage(

              q.error

            )}

          </span>



          {q.details && (

            <small className="student-error-details">

              {decodeURIComponent(

                q.details

              )}

            </small>

          )}

        </div>

      )}



      {/* ===================================================

          SUCCESS

          =================================================== */}



      {success && (

        <div className="portal-alert portal-alert-success">

          <strong>

            {q.success ===

            'schedule_claimed'

              ? 'Schedule claimed successfully.'

              : 'Schedule already connected.'}

          </strong>



          <span>

            {success}

          </span>

        </div>

      )}



      {/* ===================================================

          STUDENT INFORMATION

          =================================================== */}



      <section className="panel student-profile-panel">

        <div className="student-profile-head">

          <div>

            <span className="sched-kicker">

              STUDENT

            </span>



            <h3 className="student-profile-name">

              {profile.full_name ||

                'Student'}

            </h3>



            <p className="muted student-profile-id">

              Student ID:{' '}

              {studentProfile

                ?.student_id ||

                '—'}

            </p>

          </div>



          <Badge

            tone={

              profileComplete &&

              approved

                ? 'success'

                : 'warning'

            }

          >

            {profileComplete &&

            approved

              ? 'Ready'

              : !approved

                ? 'Pending Approval'

                : 'Incomplete Profile'}

          </Badge>

        </div>



        <div className="student-schedule-info-grid">

          <div className="student-schedule-info">

            <span>

              Department

            </span>



            <strong>

              {department?.code ||

                '—'}

            </strong>

          </div>



          <div className="student-schedule-info">

            <span>

              Program

            </span>



            <strong>

              {program?.code ||

                '—'}

            </strong>

          </div>



          <div className="student-schedule-info">

            <span>

              Year Level

            </span>



            <strong>

              {yearLevel?.name ||

                '—'}

            </strong>

          </div>



          <div className="student-schedule-info">

            <span>

              Block

            </span>



            <strong>

              {section?.code ||

                '—'}

            </strong>

          </div>

        </div>

      </section>



      {/* ===================================================

          ACCOUNT NOT APPROVED

          =================================================== */}



      {!approved && (

        <div className="portal-alert portal-alert-danger">

          <strong>

            Schedule claiming unavailable.

          </strong>



          <span>

            Your student account must be approved before you can claim a class schedule.

          </span>

        </div>

      )}



      {/* ===================================================

          PROFILE INCOMPLETE

          =================================================== */}



      {approved &&

        !profileComplete && (

          <div className="portal-alert portal-alert-danger">

            <strong>

              Student profile incomplete.

            </strong>



            <span>

              Department, Program, Year Level, and Block must be complete before a schedule can be claimed.

            </span>

          </div>

        )}



      {/* ===================================================

          CLAIM FORM

          =================================================== */}



      {approved &&

        profileComplete &&

        !membership && (

          <section className="panel student-claim-panel">

            <span className="sched-kicker">

              CLASS CODE

            </span>



            <h3 className="student-claim-title">

              Claim Published Schedule

            </h3>



            <p className="muted student-claim-description">

              Enter the class code provided for your class. AlterSched will securely verify that the schedule matches your Department, Program, Year Level, and Block.

            </p>



            <form

              action={

                claimScheduleWithCode

              }

              className="student-claim-form"

            >

              <label

                htmlFor="code"

                className="student-code-label"

              >

                Schedule Code

              </label>



              <input

                id="code"

                name="code"

                type="text"

                placeholder="ALT-XXXXXXXX"

                autoComplete="off"

                spellCheck={false}

                required

                maxLength={64}

                className="student-code-input"

              />



              <button

                type="submit"

                className="user-btn user-btn-primary"

              >

                Claim Schedule

              </button>

            </form>



            <div className="student-code-note">

              <strong>

                Your assigned class only

              </strong>



              <span>

                A code belonging to another Department, Program, Year Level, or Block will be rejected.

              </span>

            </div>

          </section>

        )}



      {/* ===================================================

          MEMBERSHIP EXISTS BUT SCHEDULE UNAVAILABLE

          =================================================== */}



      {membership &&

        !publishedSchedule && (

          <div className="portal-alert portal-alert-danger">

            <strong>

              Schedule unavailable.

            </strong>



            <span>

              Your schedule membership exists, but its associated schedule is not currently published.

            </span>

          </div>

        )}



      {versionOutOfSync && (

        <div className="portal-alert">

          <strong>

            Schedule update pending.

          </strong>



          <span>

            Your account remains connected to its authorized schedule version. AlterSched will not silently switch versions until the controlled publication workflow updates your membership.

          </span>

        </div>

      )}



      {/* ===================================================

          PUBLISHED SCHEDULE

          =================================================== */}



      {hasSchedule && (

        <>

          <section className="panel official-schedule-panel">

            <div className="official-schedule-head">

              <div>

                <span className="sched-kicker">

                  OFFICIAL SCHEDULE

                </span>



                <h3 className="official-schedule-title">

                  {publishedSchedule

                    ?.title ||

                    'Class Schedule'}

                </h3>



                <p className="muted official-schedule-meta">

                  {scheduleDepartment

                    ?.code ||

                    department?.code ||

                    '—'}



                  {' · '}



                  {scheduleProgram

                    ?.code ||

                    program?.code ||

                    '—'}



                  {' · '}



                  {scheduleYearLevel

                    ?.name ||

                    yearLevel?.name ||

                    '—'}



                  {' · Block '}



                  {scheduleSection

                    ?.code ||

                    section?.code ||

                    '—'}



                  {' · '}



                  {semester?.name ||

                    '—'}

                </p>

              </div>



              <Badge tone="success">

                Published

              </Badge>

            </div>

          </section>



          {/* ===============================================

              TIMETABLE

              =============================================== */}



          <section className="panel">

            <div className="student-timetable-head">

              <div>

                <span className="sched-kicker">

                  TIMETABLE

                </span>



                <h3 className="student-timetable-title">

                  Weekly Classes

                </h3>



                <p className="muted student-timetable-count">

                  {entries.length}{' '}

                  scheduled session

                  {entries.length === 1

                    ? ''

                    : 's'}

                </p>

              </div>



              <Badge>

                Read Only

              </Badge>

            </div>



            {entries.length >

            0 ? (

              <div className="student-table-wrap">

                <DataTable>

                  <thead>

                    <tr>

                      <th>

                        Day

                      </th>



                      <th>

                        Time

                      </th>



                      <th>

                        Subject

                      </th>



                      <th>

                        Instructor

                      </th>



                      <th>

                        Room

                      </th>



                      <th>

                        Type

                      </th>

                    </tr>

                  </thead>



                  <tbody>

                    {entries.map(

                      (entry) => {

                        const offering =

                          rel(

                            entry

                              .class_offerings

                          )



                        const subject =

                          rel(

                            offering

                              ?.subjects

                          )



                        const facultyProfile =

                          rel(

                            entry

                              .faculty_profiles

                          )



                        const facultyUser =

                          rel(

                            facultyProfile

                              ?.profiles

                          )



                        const room =

                          rel(

                            entry.rooms

                          )



                        return (

                          <tr

                            key={

                              entry.id

                            }

                          >

                            <td>

                              <strong>

                                {DAYS[

                                  entry

                                    .day_of_week

                                ] ||

                                  '—'}

                              </strong>

                            </td>



                            <td>

                              {String(

                                entry

                                  .start_time

                              ).slice(

                                0,

                                5

                              )}



                              {' – '}



                              {String(

                                entry

                                  .end_time

                              ).slice(

                                0,

                                5

                              )}

                            </td>



                            <td>

                              <strong>

                                {subject

                                  ?.code ||

                                  '—'}

                              </strong>



                              {subject

                                ?.name && (

                                <>

                                  <br />



                                  <small>

                                    {

                                      subject.name

                                    }

                                  </small>

                                </>

                              )}

                            </td>



                            <td>

                              {facultyUser

                                ?.full_name ||

                                '—'}

                            </td>



                            <td>

                              <strong>

                                {room

                                  ?.code ||

                                  '—'}

                              </strong>



                              {room

                                ?.name && (

                                <>

                                  <br />



                                  <small>

                                    {

                                      room.name

                                    }

                                  </small>

                                </>

                              )}

                            </td>



                            <td>

                              <span className="student-entry-type">

                                {entry

                                  .entry_type ||

                                  'regular'}

                              </span>

                            </td>

                          </tr>

                        )

                      }

                    )}

                  </tbody>

                </DataTable>

              </div>

            ) : (

              <Empty text="No timetable entries are available for this published schedule." />

            )}

          </section>

        </>

      )}



      {/* ===================================================

          LOCAL STYLES

          =================================================== */}



      <style>{`

        .student-schedule-nav {

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 8px;

          flex-wrap: wrap;

          margin-bottom: 16px;

        }



        .student-profile-panel,

        .official-schedule-panel {

          margin-bottom: 16px;

        }



        .student-profile-head,

        .official-schedule-head,

        .student-timetable-head {

          display: flex;

          justify-content: space-between;

          align-items: flex-start;

          gap: 14px;

          flex-wrap: wrap;

        }



        .student-profile-name,

        .official-schedule-title,

        .student-timetable-title,

        .student-claim-title {

          margin-top: 5px;

          margin-bottom: 4px;

        }



        .student-profile-id,

        .official-schedule-meta,

        .student-timetable-count {

          margin: 0;

        }



        .student-schedule-info-grid {

          display: grid;

          grid-template-columns:

            repeat(

              auto-fit,

              minmax(135px, 1fr)

            );

          gap: 9px;

          margin-top: 15px;

        }



        .student-schedule-info {

          border: 1px solid var(--line);

          border-radius: 10px;

          padding: 10px 12px;

          min-width: 0;

        }



        .student-schedule-info span {

          display: block;

          margin-bottom: 4px;

          font-size: 10px;

          color: var(--muted);

          text-transform: uppercase;

          letter-spacing: 0.07em;

        }



        .student-schedule-info strong {

          display: block;

          font-size: 13px;

          word-break: break-word;

        }



        .student-claim-panel {

          max-width: 680px;

        }



        .student-claim-description {

          margin-top: 0;

          margin-bottom: 17px;

        }



        .student-claim-form {

          display: grid;

          grid-template-columns:

            minmax(220px, 1fr)

            auto;

          gap: 8px;

          align-items: end;

        }



        .student-code-label {

          grid-column: 1 / -1;

          font-size: 12px;

          font-weight: 700;

        }



        .student-code-input {

          width: 100%;

          min-height: 38px;

          padding: 8px 11px;

          border: 1px solid var(--line);

          border-radius: 9px;

          background: var(--panel);

          color: inherit;

          font: inherit;

          font-weight: 700;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          outline: none;

        }



        .student-code-input:focus {

          border-color: currentColor;

        }



        .student-code-note {

          display: flex;

          flex-direction: column;

          gap: 3px;

          margin-top: 14px;

          padding: 10px 12px;

          border: 1px solid var(--line);

          border-radius: 9px;

          font-size: 12px;

        }



        .student-code-note span {

          color: var(--muted);

        }



        .student-timetable-head {

          align-items: center;

          margin-bottom: 12px;

        }



        .student-table-wrap {

          overflow-x: auto;

        }



        .student-entry-type {

          text-transform: capitalize;

        }



        .student-error-details {

          display: block;

          margin-top: 5px;

        }



        @media (max-width: 640px) {

          .student-claim-form {

            grid-template-columns: 1fr;

          }



          .student-code-label {

            grid-column: auto;

          }



          .student-claim-form .user-btn {

            width: 100%;

            justify-content: center;

          }



          .student-schedule-info-grid {

            grid-template-columns:

              repeat(2, minmax(0, 1fr));

          }

        }



        @media (max-width: 420px) {

          .student-schedule-info-grid {

            grid-template-columns: 1fr;

          }

        }

      `}</style>

    </>

  )

}