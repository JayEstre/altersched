import { createClient } from "@/lib/supabase/server";



import {



  PageHead,



  Stat,



  Empty,



  Badge,



} from "@/components/ui";
import { DataTable } from '@/components/data-table';



import {
  createSubject,
  updateSubject,
  setSubjectStatus,
  deleteSubject,
} from "./actions";



type SearchParams = Promise<{



  success?: string;



  error?: string;



  details?: string;



}>;



function getYearLabel(



  year: number | null



) {



  switch (Number(year)) {



    case 1:



      return "1st Year";



    case 2:



      return "2nd Year";



    case 3:



      return "3rd Year";



    case 4:



      return "4th Year";



    default:



      return "—";



  }



}



function getSuccessMessage(



  success?: string



) {



  switch (success) {



    case "subject_created":



      return "Subject added successfully.";



    case "subject_updated":



      return "Subject updated successfully.";



    default:



      return "Changes saved successfully.";



  }



}



export default async function Page({



  searchParams,



}: {



  searchParams: SearchParams;



}) {



  const supabase =



    await createClient();



  const params =



    await searchParams;



  const [



    { data: programs },



    { data: subjects },



    { data: roomTypes },



  ] = await Promise.all([



    supabase



      .from("programs")



      .select(



        "id,department_id,code,name"



      )



      .ilike("code", "BSIT")



      .eq("is_active", true),



    supabase



      .from("subjects")



      .select(



        `



          id,



          department_id,



          code,



          name,



          units,



          lecture_hours,



          lab_hours,



          description,



          is_active,



          default_year_level,



          default_room_type_id,



          default_faculty_id



        `



      )



      



      .order("code"),



    supabase



      .from("room_types")



      .select("id,name")



      .order("name"),



  ]);



  const bsit =



    programs?.[0] ?? null;



    // Approved BSIT instructors and their subject qualifications.



  const { data: facultyProfiles } = bsit



    ? await supabase



        .from("faculty_profiles")



        .select("id,profile_id,employee_id,department_id")



        .eq("department_id", bsit.department_id)



    : { data: [] as any[] };







  const profileIds = (facultyProfiles ?? [])



    .map((faculty: any) => faculty.profile_id)



    .filter(Boolean);







  const { data: instructorProfiles } = profileIds.length



    ? await supabase



        .from("profiles")



        .select("id,full_name,email,role,account_status")



        .in("id", profileIds)



        .eq("role", "faculty")



        .eq("account_status", "approved")



    : { data: [] as any[] };







  const approvedProfileMap = new Map(



    (instructorProfiles ?? []).map((profile: any) => [profile.id, profile])



  );







  const approvedFaculty = (facultyProfiles ?? [])



    .filter((faculty: any) => approvedProfileMap.has(faculty.profile_id))



    .map((faculty: any) => ({



      ...faculty,



      profile: approvedProfileMap.get(faculty.profile_id),



    }))



    .sort((a: any, b: any) =>



      String(a.profile?.full_name ?? a.profile?.email ?? "").localeCompare(



        String(b.profile?.full_name ?? b.profile?.email ?? "")



      )



    );







  const approvedFacultyIds = approvedFaculty.map((faculty: any) => faculty.id);







  const { data: facultySubjects } = approvedFacultyIds.length



    ? await supabase



        .from("faculty_subjects")



        .select("faculty_id,subject_id")



        .in("faculty_id", approvedFacultyIds)



    : { data: [] as any[] };







  const qualifiedFacultyBySubject = new Map<string, Set<string>>();



  for (const row of facultySubjects ?? []) {



    const subjectId = String((row as any).subject_id);



    const facultyId = String((row as any).faculty_id);



    if (!qualifiedFacultyBySubject.has(subjectId)) {



      qualifiedFacultyBySubject.set(subjectId, new Set());



    }



    qualifiedFacultyBySubject.get(subjectId)!.add(facultyId);



  }







const list =



    (subjects ?? []).filter(



      (subject: any) =>



        subject.department_id ===



        bsit?.department_id



    );



  const roomName = new Map(



    (roomTypes ?? []).map(



      (room: any) => [



        room.id,



        room.name,



      ]



    )



  );



  return (



    <div className="page-stack">



      {/* ================================================



          HEADER



      ================================================= */}



      <PageHead



        eyebrow="COLLEGE OF COMPUTER STUDIES"



        title="BSIT Subject Catalog"



        description="Manage official BSIT subjects and the scheduling requirements used by AlterSched."



      />



      {/* ================================================



          ALERTS



      ================================================= */}



      {params.error && (



        <div className="alert error">



          <strong>



            Unable to save subject.



          </strong>



          <span>



            {params.error.replaceAll(



              "_",



              " "



            )}



            {params.details



              ? `: ${decodeURIComponent(



                  params.details



                )}`



              : ""}



          </span>



        </div>



      )}



      {params.success && (



        <div className="alert success">



          <strong>



            {getSuccessMessage(



              params.success



            )}



          </strong>



          <span>



            The updated subject information



            is now available to AlterSched.



          </span>



        </div>



      )}



      {/* ================================================



          SUMMARY



      ================================================= */}



      <div className="stats-grid subject-stats">



        <Stat



          label="Program"



          value="BSIT"



        />



        <Stat



          label="Active Subjects"



          value={String(list.length)}



        />



        <Stat



          label="Room Types"



          value={String(



            roomTypes?.length ?? 0



          )}



        />



      </div>



      {/* ================================================



          ADD SUBJECT



      ================================================= */}



      <section className="panel subject-add-panel">



        <div className="subject-section-header">



          <div>



            <span className="subject-eyebrow">



              SUBJECT MANAGEMENT



            </span>



            <h2>



              Add BSIT Subject



            </h2>



            <p>



              Register a subject and define



              the requirements used during



              automatic schedule generation.



            </p>



          </div>



        </div>



        {!bsit ? (



          <div className="alert error">



            <strong>



              BSIT program unavailable.



            </strong>



            <span>



              An active BSIT program must



              exist before subjects can be



              registered.



            </span>



          </div>



        ) : (



          <form



            action={createSubject}



            className="subject-create-form"



          >



            <input



              type="hidden"



              name="department_id"



              value={



                bsit.department_id



              }



            />



            {/* ROW 1 */}



            <div className="subject-create-row subject-create-row-main">



              <label className="field">



                <span className="field-label">



                  Subject Code



                  <span className="required">



                    \*



                  </span>



                </span>



                <input



                  name="code"



                  required



                  autoComplete="off"



                  placeholder="e.g. PROG1"



                />



              </label>



              <label className="field subject-name-field">



                <span className="field-label">



                  Subject Name



                  <span className="required">



                    \*



                  </span>



                </span>



                <input



                  name="subject_name"



                  required



                  autoComplete="off"



                  placeholder="e.g. Computer Programming 1"



                />



              </label>



              <label className="field">



                <span className="field-label">



                  Units



                  <span className="required">



                    \*



                  </span>



                </span>



                <input



                  name="units"



                  type="number"



                  min="0"



                  max="20"



                  step="0.5"



                  required



                  placeholder="3"



                />



              </label>



            </div>



            {/* ROW 2 */}



            <div className="subject-create-row subject-create-row-details">



              <label className="field">



                <span className="field-label">



                  Lecture Hours



                  <span className="required">



                    \*



                  </span>



                </span>



                <input



                  name="lecture_hours"



                  type="number"



                  min="0"



                  max="40"



                  step="0.5"



                  defaultValue="0"



                  required



                />



              </label>



              <label className="field">



                <span className="field-label">



                  Laboratory Hours



                  <span className="required">



                    \*



                  </span>



                </span>



                <input



                  name="lab_hours"



                  type="number"



                  min="0"



                  max="40"



                  step="0.5"



                  defaultValue="0"



                  required



                />



              </label>



              <label className="field">



                <span className="field-label">



                  Year Level



                  <span className="required">



                    \*



                  </span>



                </span>



                <select



                  name="default_year_level"



                  required



                  defaultValue=""



                >



                  <option



                    value=""



                    disabled



                  >



                    Select year level



                  </option>



                  <option value="1">



                    1st Year



                  </option>



                  <option value="2">



                    2nd Year



                  </option>



                  <option value="3">



                    3rd Year



                  </option>



                  <option value="4">



                    4th Year



                  </option>



                </select>



              </label>



              <label className="field">



                <span className="field-label">



                  Room Type



                </span>



                <select



                  name="default_room_type_id"



                  defaultValue=""



                >



                  <option value="">



                    Any compatible room



                  </option>



                  {(roomTypes ?? []).map(



                    (room: any) => (



                      <option



                        key={room.id}



                        value={room.id}



                      >



                        {room.name}



                      </option>



                    )



                  )}



                </select>



              </label>



            </div>



            {/* ROW 3 */}



            <div className="subject-create-row subject-create-row-bottom">



              <label className="field">



                <span className="field-label">



                  Description



                </span>



                <input



                  name="description"



                  autoComplete="off"



                  placeholder="Optional subject notes or description"



                />



              </label>



              <button



                type="submit"



                className="button primary subject-add-button"



              >



                Add Subject



              </button>



            </div>



          </form>



        )}



      </section>



      {/* ================================================



          SUBJECT CATALOG



      ================================================= */}



      <section className="panel subject-catalog-panel">



        <div className="subject-catalog-header">



          <div>



            <span className="subject-eyebrow">



              SUBJECT CATALOG



            </span>



            <h2>



              Official BSIT Subjects



            </h2>



            <p>



              Edit subject requirements



              directly from the table.



            </p>



          </div>



          <div className="subject-total">



            <strong>



              {list.length}



            </strong>



            <span>



              {list.length === 1



                ? "Active Subject"



                : "Active Subjects"}



            </span>



          </div>



        </div>



        {!list.length ? (



          <Empty



            title="No BSIT subjects yet"



            text="Add the official BSIT subjects above before generating schedules."



          />



        ) : (



          <div className="subject-table-scroll">



            <DataTable minWidth={1200}>



              <thead>



                <tr>



                  <th>Code</th>



                  <th>Subject</th>



                  <th>Units</th>



                  <th>Lecture</th>



                  <th>Lab</th>



                  <th>Year Level</th>



                  <th>Room Type</th>



                  <th>Instructor</th>



                  <th>Status</th>



                  <th>Actions</th>



                </tr>



              </thead>



              <tbody>



                {list.map(



                  (subject: any) => {



                    const formId =



                      `subject-${subject.id}`;



                    return (



                      <tr



                        key={



                          subject.id



                        }



                      >



                        {/* CODE */}



                        <td className="subject-code-column">



                          <input



                            form={formId}



                            name="code"



                            defaultValue={



                              subject.code



                            }



                            required



                            className="subject-table-input subject-code-input"



                          />



                        </td>



                        {/* SUBJECT */}



                        <td className="subject-title-column">



                          <input



                            form={formId}



                            name="subject_name"



                            defaultValue={



                              subject.name



                            }



                            required



                            className="subject-table-input subject-title-input"



                          />



                          <input



                            form={formId}



                            name="description"



                            defaultValue={



                              subject.description ??



                              ""



                            }



                            placeholder="No description"



                            className="subject-description-input"



                          />



                        </td>



                        {/* UNITS */}



                        <td>



                          <input



                            form={formId}



                            name="units"



                            type="number"



                            min="0"



                            max="20"



                            step="0.5"



                            defaultValue={



                              subject.units



                            }



                            required



                            className="subject-number-input"



                          />



                        </td>



                        {/* LECTURE */}



                        <td>



                          <input



                            form={formId}



                            name="lecture_hours"



                            type="number"



                            min="0"



                            max="40"



                            step="0.5"



                            defaultValue={



                              Number(



                                subject.lecture_hours ??



                                  0



                              )



                            }



                            required



                            className="subject-number-input"



                          />



                        </td>



                        {/* LAB */}



                        <td>



                          <input



                            form={formId}



                            name="lab_hours"



                            type="number"



                            min="0"



                            max="40"



                            step="0.5"



                            defaultValue={



                              Number(



                                subject.lab_hours ??



                                  0



                              )



                            }



                            required



                            className="subject-number-input"



                          />



                        </td>



                        {/* YEAR */}



                        <td>



                          <select



                            form={formId}



                            name="default_year_level"



                            defaultValue={String(



                              subject.default_year_level ??



                                ""



                            )}



                            required



                            className="subject-table-select"



                            aria-label={`Year level for ${subject.code}`}



                          >



                            <option value="1">



                              1st Year



                            </option>



                            <option value="2">



                              2nd Year



                            </option>



                            <option value="3">



                              3rd Year



                            </option>



                            <option value="4">



                              4th Year



                            </option>



                          </select>



                          <span className="subject-current-value">



                            {getYearLabel(



                              subject.default_year_level



                            )}



                          </span>



                        </td>



                        {/* ROOM */}



                        <td>



                          <select



                            form={formId}



                            name="default_room_type_id"



                            defaultValue={



                              subject.default_room_type_id ??



                              ""



                            }



                            className="subject-table-select"



                            aria-label={`Room type for ${subject.code}`}



                          >



                            <option value="">



                              Any Room



                            </option>



                            {(roomTypes ??



                              []).map(



                              (



                                room: any



                              ) => (



                                <option



                                  key={



                                    room.id



                                  }



                                  value={



                                    room.id



                                  }



                                >



                                  {



                                    room.name



                                  }



                                </option>



                              )



                            )}



                          </select>



                          <span className="subject-current-value">



                            {roomName.get(



                              subject.default_room_type_id



                            ) ??



                              "Any compatible room"}



                          </span>



                        </td>



                        {/* PREFERRED / DEFAULT INSTRUCTOR */}



                        <td>



                          <select



                            form={formId}



                            name="default_faculty_id"



                            defaultValue={subject.default_faculty_id ?? ""}



                            className="subject-table-select subject-instructor-select"



                            aria-label={`Preferred instructor for ${subject.code}`}



                          >



                            <option value="">Auto assign</option>



                            {approvedFaculty



                              .filter((faculty: any) =>



                                qualifiedFacultyBySubject



                                  .get(String(subject.id))



                                  ?.has(String(faculty.id))



                              )



                              .map((faculty: any) => (



                                <option key={faculty.id} value={faculty.id}>



                                  {faculty.profile?.full_name ??



                                    faculty.profile?.email ??



                                    faculty.employee_id ??



                                    "Instructor"}



                                </option>



                              ))}



                          </select>



                          {!qualifiedFacultyBySubject.get(String(subject.id))?.size && (



                            <span className="subject-instructor-note">



                              No qualified instructor



                            </span>



                          )}



                        </td>



                        {/* STATUS */}



                        <td>



                          <Badge tone="success">



                            Active



                          </Badge>



                        </td>



                        {/* ACTION */}



                        <td className="subject-actions-column">



                          <form



                            id={formId}



                            action={



                              updateSubject



                            }



                          >



                            <input



                              type="hidden"



                              name="subject_id"



                              value={



                                subject.id



                              }



                            />



                            <input



                              type="hidden"



                              name="department_id"



                              value={



                                subject.department_id



                              }



                            />



                            <button



                              type="submit"



                              className="subject-save-button"



                            >



                              Save



                            </button>



                          </form>



                        </td>



                      </tr>



                    );



                  }



                )}



              </tbody>



            </DataTable>



          </div>



        )}



      </section>



      {/* ================================================



          PAGE STYLES



      ================================================= */}



      <style>{`



        .subject-stats {



          grid-template-columns:



            repeat(3, minmax(0, 1fr));



        }



        .subject-add-panel,



        .subject-catalog-panel {



          overflow: hidden;



        }



        .subject-section-header,



        .subject-catalog-header {



          display: flex;



          align-items: flex-start;



          justify-content: space-between;



          gap: 24px;



        }



        .subject-section-header {



          margin-bottom: 22px;



        }



        .subject-catalog-header {



          margin-bottom: 18px;



        }



        .subject-section-header h2,



        .subject-catalog-header h2 {



          margin: 5px 0 5px;



          color: #152c49;



          font-size: 19px;



          line-height: 1.25;



        }



        .subject-section-header p,



        .subject-catalog-header p {



          margin: 0;



          color: #718096;



          font-size: 12px;



          line-height: 1.55;



        }



        .subject-eyebrow {



          color: #1f65b5;



          font-size: 10px;



          font-weight: 800;



          letter-spacing: 0.13em;



        }



        /* =============================================



           CREATE FORM



        ============================================== */



        .subject-create-form {



          display: flex;



          flex-direction: column;



          gap: 16px;



        }



        .subject-create-row {



          display: grid;



          gap: 14px;



          align-items: end;



        }



        .subject-create-row-main {



          grid-template-columns:



            minmax(150px, 0.7fr)



            minmax(320px, 2fr)



            minmax(100px, 0.45fr);



        }



        .subject-create-row-details {



          grid-template-columns:



            repeat(4, minmax(0, 1fr));



        }



        .subject-create-row-bottom {



          grid-template-columns:



            minmax(300px, 1fr)



            auto;



        }



        .subject-create-form .field {



          display: flex;



          min-width: 0;



          flex-direction: column;



          gap: 6px;



        }



        .subject-create-form .field-label {



          color: #43566d;



          font-size: 11px;



          font-weight: 700;



        }



        .subject-create-form .required {



          margin-left: 3px;



          color: #d64545;



        }



        .subject-create-form input,



        .subject-create-form select {



          width: 100%;



          min-height: 40px;



          box-sizing: border-box;



          border: 1px solid #d7e0eb;



          border-radius: 7px;



          background: #ffffff;



          color: #1c3049;



          padding: 0 11px;



          outline: none;



          font: inherit;



          font-size: 12px;



        }



        .subject-create-form input:focus,



        .subject-create-form select:focus {



          border-color: #6da7e5;



          box-shadow:



            0 0 0 3px



            rgba(45, 119, 197, 0.09);



        }



        .subject-add-button {



          min-width: 130px;



          min-height: 40px;



        }



        /* =============================================



           CATALOG HEADER



        ============================================== */



        .subject-total {



          display: flex;



          align-items: center;



          gap: 8px;



          flex-shrink: 0;



          padding: 8px 12px;



          border: 1px solid #dce4ed;



          border-radius: 8px;



          background: #f8fafc;



        }



        .subject-total strong {



          color: #18395f;



          font-size: 17px;



        }



        .subject-total span {



          color: #718096;



          font-size: 10px;



        }



        /* =============================================



           TABLE



        ============================================== */



        .subject-table-scroll {



          width: 100%;



          overflow-x: auto;



          border: 1px solid #dce4ed;



          border-radius: 8px;



          background: #ffffff;



        }



        .subject-catalog-table {



          width: 100%;



          min-width: 1280px;



          border-collapse: separate;



          border-spacing: 0;



          table-layout: fixed;



        }



        .subject-catalog-table th {



          position: sticky;



          top: 0;



          z-index: 2;



          padding: 10px 9px;



          border-right: 1px solid #e5ebf1;



          border-bottom: 1px solid #dce4ed;



          background: #f3f6fa;



          color: #53677d;



          text-align: left;



          font-size: 10px;



          font-weight: 800;



          letter-spacing: 0.04em;



          text-transform: uppercase;



          white-space: nowrap;



        }



        .subject-catalog-table td {



          padding: 8px 9px;



          border-right: 1px solid #edf1f5;



          border-bottom: 1px solid #e8edf3;



          color: #30455d;



          vertical-align: middle;



          font-size: 11px;



        }



        .subject-catalog-table th:last-child,



        .subject-catalog-table td:last-child {



          border-right: 0;



        }



        .subject-catalog-table tbody tr:last-child td {



          border-bottom: 0;



        }



        .subject-catalog-table tbody tr:nth-child(even) {



          background: #fafbfd;



        }



        .subject-catalog-table tbody tr:hover {



          background: #f5f9fd;



        }



        .subject-catalog-table th:nth-child(1) {



          width: 105px;



        }



        .subject-catalog-table th:nth-child(2) {



          width: 260px;



        }



        .subject-catalog-table th:nth-child(3),



        .subject-catalog-table th:nth-child(4),



        .subject-catalog-table th:nth-child(5) {



          width: 75px;



        }



        .subject-catalog-table th:nth-child(6) {



          width: 120px;



        }



        .subject-catalog-table th:nth-child(7) {



          width: 150px;



        }



        .subject-catalog-table th:nth-child(8) {



          width: 190px;



        }



        .subject-catalog-table th:nth-child(9) {



          width: 85px;



        }



        .subject-catalog-table th:nth-child(10) {



          width: 85px;



        }



        /* =============================================



           TABLE CONTROLS



        ============================================== */



        .subject-table-input,



        .subject-number-input,



        .subject-table-select,



        .subject-description-input {



          box-sizing: border-box;



          border: 1px solid transparent;



          border-radius: 5px;



          background: transparent;



          color: #263d57;



          outline: none;



          font: inherit;



        }



        .subject-table-input:hover,



        .subject-number-input:hover,



        .subject-table-select:hover,



        .subject-description-input:hover {



          border-color: #d9e3ed;



          background: #ffffff;



        }



        .subject-table-input:focus,



        .subject-number-input:focus,



        .subject-table-select:focus,



        .subject-description-input:focus {



          border-color: #6fa8e4;



          background: #ffffff;



          box-shadow:



            0 0 0 2px



            rgba(45, 119, 197, 0.08);



        }



        .subject-table-input {



          width: 100%;



          min-height: 32px;



          padding: 5px 6px;



        }



        .subject-code-input {



          color: #1d5fa7;



          font-weight: 800;



        }



        .subject-title-input {



          color: #1f354e;



          font-weight: 700;



        }



        .subject-description-input {



          width: 100%;



          min-height: 25px;



          margin-top: 2px;



          padding: 3px 6px;



          color: #8190a0;



          font-size: 10px;



        }



        .subject-number-input {



          width: 55px;



          min-height: 32px;



          padding: 5px;



          text-align: center;



        }



        .subject-table-select {



          width: 100%;



          min-height: 32px;



          padding: 4px 6px;



        }



        .subject-current-value {



          display: none;



        }



        .subject-instructor-select {



          min-width: 170px;



        }



        .subject-instructor-note {



          display: block;



          margin-top: 3px;



          color: #b45309;



          font-size: 9px;



          font-weight: 700;



        }



        .subject-actions-column {



          text-align: center;



        }



        .subject-save-button {



          min-height: 30px;



          padding: 0 12px;



          border: 1px solid #bcd0e5;



          border-radius: 6px;



          background: #ffffff;



          color: #1e5d9f;



          cursor: pointer;



          font-size: 10px;



          font-weight: 800;



          transition:



            background 0.15s ease,



            border-color 0.15s ease;



        }



        .subject-save-button:hover {



          border-color: #8db5de;



          background: #edf5fd;



        }



        /* =============================================



           RESPONSIVE



        ============================================== */



        @media (max-width: 1050px) {



          .subject-create-row-main {



            grid-template-columns:



              1fr 2fr;



          }



          .subject-create-row-main .field:last-child {



            grid-column: 1 / -1;



          }



          .subject-create-row-details {



            grid-template-columns:



              repeat(2, minmax(0, 1fr));



          }



        }



        @media (max-width: 760px) {



          .subject-stats {



            grid-template-columns: 1fr;



          }



          .subject-create-row-main,



          .subject-create-row-details,



          .subject-create-row-bottom {



            grid-template-columns: 1fr;



          }



          .subject-create-row-main .field:last-child {



            grid-column: auto;



          }



          .subject-add-button {



            width: 100%;



          }



          .subject-catalog-header {



            flex-direction: column;



          }



        }







        /* =====================================================

           SUBJECTS — COMPACT DESKTOP WORKSPACE

           Layout/sizing only. Instructor functionality preserved.

        ====================================================== */

        @media (min-width: 1051px) {

          .page-stack {

            gap: 10px !important;

          }



          .subject-stats {

            gap: 10px !important;

            margin-bottom: 0 !important;

          }



          .subject-stats > :global(\*) {

            min-height: 78px !important;

          }



          .subject-add-panel,

          .subject-catalog-panel {

            padding: 10px 12px !important;

            border-radius: 10px !important;

          }



          .subject-section-header,

          .subject-catalog-header {

            gap: 10px !important;

          }



          .subject-section-header {

            margin-bottom: 8px !important;

          }



          .subject-catalog-header {

            margin-bottom: 8px !important;

          }



          .subject-section-header h2,

          .subject-catalog-header h2 {

            margin: 2px 0 !important;

            font-size: 15px !important;

            line-height: 1.15 !important;

          }



          .subject-section-header p,

          .subject-catalog-header p {

            font-size: 10px !important;

            line-height: 1.3 !important;

          }



          .subject-eyebrow {

            font-size: 8px !important;

            letter-spacing: .1em !important;

          }



          .subject-create-form {

            gap: 7px !important;

          }



          .subject-create-row {

            gap: 8px !important;

          }



          .subject-create-form .field {

            gap: 3px !important;

          }



          .subject-create-form .field-label {

            font-size: 9px !important;

            line-height: 1.1 !important;

          }



          .subject-create-form input,

          .subject-create-form select {

            min-height: 28px !important;

            height: 28px !important;

            padding: 0 8px !important;

            border-radius: 5px !important;

            font-size: 10px !important;

          }



          .subject-add-button {

            min-width: 100px !important;

            min-height: 28px !important;

            height: 28px !important;

            padding: 0 10px !important;

            font-size: 10px !important;

          }



          .subject-total {

            gap: 5px !important;

            padding: 4px 7px !important;

            border-radius: 6px !important;

          }



          .subject-total strong { font-size: 13px !important; }

          .subject-total span { font-size: 8px !important; }



          .subject-catalog-table {

            min-width: 1040px !important;

          }



          .subject-catalog-table th {

            padding: 5px 6px !important;

            font-size: 8px !important;

            line-height: 1.1 !important;

          }



          .subject-catalog-table td {

            padding: 4px 6px !important;

            font-size: 9px !important;

          }



          .subject-catalog-table th:nth-child(1) { width: 78px !important; }

          .subject-catalog-table th:nth-child(2) { width: 220px !important; }

          .subject-catalog-table th:nth-child(3),

          .subject-catalog-table th:nth-child(4),

          .subject-catalog-table th:nth-child(5) { width: 58px !important; }

          .subject-catalog-table th:nth-child(6) { width: 100px !important; }

          .subject-catalog-table th:nth-child(7) { width: 125px !important; }

          .subject-catalog-table th:nth-child(8) { width: 155px !important; }

          .subject-catalog-table th:nth-child(9) { width: 70px !important; }

          .subject-catalog-table th:nth-child(10) { width: 190px !important; }



          .subject-table-input,

          .subject-number-input,

          .subject-table-select {

            min-height: 25px !important;

            height: 25px !important;

            padding: 2px 5px !important;

            font-size: 9px !important;

            border-radius: 4px !important;

          }



          .subject-description-input {

            min-height: 19px !important;

            height: 19px !important;

            margin-top: 2px !important;

            padding: 1px 5px !important;

            font-size: 8px !important;

          }



          .subject-number-input { width: 42px !important; }

          .subject-instructor-select { min-width: 135px !important; }



          .subject-instructor-note {

            margin-top: 1px !important;

            font-size: 7px !important;

            line-height: 1.1 !important;

          }



          .subject-save-button {

            min-height: 24px !important;

            height: 24px !important;

            padding: 0 7px !important;

            border-radius: 5px !important;

            font-size: 8px !important;

          }

        }

`}</style>



    </div>



  );



}