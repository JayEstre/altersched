<<<<<<< HEAD
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge, Notice } from '@/components/ui'
import { DataTable } from '@/components/data-table'
=======
import { createClient } from "@/lib/supabase/server";
import { PageHead, Stat, Empty, Badge } from "@/components/ui";
import { DataTable } from '@/components/data-table';
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
import {
  createRoom,
  updateRoom,
  setRoomActive,
  deleteRoom,
  addRoomAvailability,
  removeRoomAvailability,
<<<<<<< HEAD
} from './actions'
import { DAY_NAMES, DAY_OPTIONS } from '@/lib/format'
import styles from './page.module.css'
=======
} from "./actions";

const days = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
<<<<<<< HEAD
    success?: string
    error?: string
    details?: string
  }>
}) {
  const s = await createClient()
  const p = await searchParams

  const [rr, tr, sr, ar] = await Promise.all([
    s
      .from('rooms')
      .select('id,code,name,building,floor,capacity,is_active,room_type_id,room_types(name)')
      .order('code'),
    s.from('room_types').select('id,name').order('name'),
    s
      .from('semesters')
      .select('id,name,is_active,academic_years(name)')
      .order('start_date', { ascending: false }),
    s
      .from('room_availability')
      .select('id,room_id,semester_id,day_of_week,start_time,end_time,status,reason')
      .order('day_of_week')
      .order('start_time'),
  ])

  const rooms = rr.data ?? []
  const types = tr.data ?? []
  const semesters = sr.data ?? []
  const availability = ar.data ?? []
  const activeSemester = semesters.find((x) => x.is_active)

  return (
    <div className={styles.scope}>
=======
    success?: string;
    error?: string;
    details?: string;
  }>;
}) {
  const s = await createClient();
  const p = await searchParams;

  const [rr, tr, sr, ar] = await Promise.all([
    s
      .from("rooms")
      .select(
        "id,code,name,building,floor,capacity,is_active,room_type_id,room_types(name)"
      )
      .order("code"),

    s.from("room_types").select("id,name").order("name"),

    s
      .from("semesters")
      .select("id,name,is_active,academic_years(name)")
      .order("start_date", { ascending: false }),

    s
      .from("room_availability")
      .select(
        "id,room_id,semester_id,day_of_week,start_time,end_time,status,reason"
      )
      .order("day_of_week")
      .order("start_time"),
  ]);

  const rooms = rr.data ?? [];
  const types = tr.data ?? [];
  const semesters = sr.data ?? [];
  const availability = ar.data ?? [];
  const activeSemester = semesters.find((x: any) => x.is_active);

  return (
    <>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <PageHead
        eyebrow="RESOURCES"
        title="Rooms & Labs"
        description="Manage rooms, laboratories, capacities, types, status, and semester availability used by the scheduling engine."
      />
<<<<<<< HEAD
      <div className="stats-grid">
        <Stat label="Rooms" value={rooms.length} />
        <Stat label="Active Rooms" value={rooms.filter((x) => x.is_active).length} />
        <Stat label="Room Types" value={types.length} />
        <Stat label="Availability Records" value={availability.length} />
      </div>
      {p.success && (
        <Notice tone="success" title="Success">
          {decodeURIComponent(p.success)}
        </Notice>
      )}
      {p.error && (
        <Notice tone="danger" title="Action failed">
          {decodeURIComponent(p.error)}
          {p.details ? ` Database: ${decodeURIComponent(p.details)}` : ''}
        </Notice>
      )}
      {/* ======================================================
          ADD ROOM
      ====================================================== */}
=======

      <div className="stats-grid">
        <Stat label="Rooms" value={rooms.length} />
        <Stat
          label="Active Rooms"
          value={rooms.filter((x: any) => x.is_active).length}
        />
        <Stat label="Room Types" value={types.length} />
        <Stat label="Availability Records" value={availability.length} />
      </div>

      {p.success && (
        <div className="sched-alert sched-alert-success">
          <div>
            <strong>Success</strong>
            <span>{decodeURIComponent(p.success)}</span>
          </div>
        </div>
      )}

      {p.error && (
        <div className="sched-alert sched-alert-danger">
          <div>
            <strong>Action failed</strong>
            <span>
              {decodeURIComponent(p.error)}
              {p.details
                ? ` Database: ${decodeURIComponent(p.details ?? "")}`
                : ""}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================
          ADD ROOM
      ====================================================== */}

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">ROOM SETUP</span>
            <h3>Add Room / Laboratory</h3>
            <p>
<<<<<<< HEAD
              Create a schedulable room or laboratory and define its capacity, type, building, and
              floor.
            </p>
          </div>
        </div>
=======
              Create a schedulable room or laboratory and define its capacity,
              type, building, and floor.
            </p>
          </div>
        </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        <div className="sched-section-body">
          <form action={createRoom} className="sched-form">
            <div className="sched-form-grid room-create-grid">
              <div className="sched-field">
                <label>Room Code</label>
<<<<<<< HEAD
                <input name="code" placeholder="e.g. LAB 1" autoComplete="off" required />
              </div>
=======
                <input
                  name="code"
                  placeholder="e.g. LAB 1"
                  autoComplete="off"
                  required
                />
              </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              <div className="sched-field">
                <label>Name</label>
                <input
                  name="name"
                  placeholder="e.g. Computer Laboratory 1"
                  autoComplete="off"
                  required
                />
              </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              <div className="sched-field">
                <label>Room Type</label>
                <select name="room_type_id">
                  <option value="">General / Unspecified</option>
<<<<<<< HEAD
                  {types.map((x) => (
=======

                  {types.map((x: any) => (
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
<<<<<<< HEAD
              <div className="sched-field">
                <label>Capacity</label>
                <input name="capacity" type="number" min="1" step="1" placeholder="40" required />
              </div>
              <div className="sched-field">
                <label>Building</label>
                <input name="building" placeholder="Optional" autoComplete="off" />
              </div>
              <div className="sched-field">
                <label>Floor</label>
                <input name="floor" placeholder="Optional" autoComplete="off" />
              </div>
            </div>
=======

              <div className="sched-field">
                <label>Capacity</label>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="40"
                  required
                />
              </div>

              <div className="sched-field">
                <label>Building</label>
                <input
                  name="building"
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>

              <div className="sched-field">
                <label>Floor</label>
                <input
                  name="floor"
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
            </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
            <div className="sched-form-actions">
              <button type="submit" className="sched-primary-btn">
                Create Room
              </button>
            </div>
          </form>
        </div>
      </section>
<<<<<<< HEAD
      {/* ======================================================
          ROOM DIRECTORY / EDIT
      ====================================================== */}
=======

      {/* ======================================================
          ROOM DIRECTORY / EDIT
      ====================================================== */}

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">ROOM DIRECTORY</span>
            <h3>Configured Rooms</h3>
            <p>
<<<<<<< HEAD
              Edit room information directly from the table. Inactive rooms remain visible so they
              can be reactivated later.
            </p>
          </div>
          <Badge>{rooms.length} Total</Badge>
        </div>
=======
              Edit room information directly from the table. Inactive rooms
              remain visible so they can be reactivated later.
            </p>
          </div>

          <Badge>{rooms.length} Total</Badge>
        </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        <div className="sched-section-body">
          {rooms.length ? (
            <div className="room-table-wrap">
              <DataTable>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Building</th>
                    <th>Floor</th>
                    <th>Capacity</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
<<<<<<< HEAD
                <tbody>
                  {rooms.map((x) => {
                    const rt = Array.isArray(x.room_types) ? x.room_types[0] : x.room_types
                    const formId = `room-update-${x.id}`
=======

                <tbody>
                  {rooms.map((x: any) => {
                    const rt = Array.isArray(x.room_types)
                      ? x.room_types[0]
                      : x.room_types;

                    const formId = `room-update-${x.id}`;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

                    return (
                      <tr key={x.id}>
                        <td>
                          <input
                            form={formId}
                            className="room-table-input room-code-input"
                            name="code"
                            defaultValue={x.code}
                            required
                          />
                        </td>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                        <td>
                          <input
                            form={formId}
                            className="room-table-input room-name-input"
                            name="name"
                            defaultValue={x.name}
                            required
                          />
                        </td>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                        <td>
                          <input
                            form={formId}
                            className="room-table-input"
                            name="building"
<<<<<<< HEAD
                            defaultValue={x.building ?? ''}
                            placeholder="—"
                          />
                        </td>
=======
                            defaultValue={x.building ?? ""}
                            placeholder="—"
                          />
                        </td>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                        <td>
                          <input
                            form={formId}
                            className="room-table-input room-floor-input"
                            name="floor"
<<<<<<< HEAD
                            defaultValue={x.floor ?? ''}
                            placeholder="—"
                          />
                        </td>
=======
                            defaultValue={x.floor ?? ""}
                            placeholder="—"
                          />
                        </td>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                        <td>
                          <input
                            form={formId}
                            className="room-table-input room-capacity-input"
                            name="capacity"
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={x.capacity}
                            required
                          />
                        </td>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                        <td>
                          <select
                            form={formId}
                            className="room-table-select"
                            name="room_type_id"
<<<<<<< HEAD
                            defaultValue={x.room_type_id ?? ''}
                          >
                            <option value="">General</option>
                            {types.map((type) => (
=======
                            defaultValue={x.room_type_id ?? ""}
                          >
                            <option value="">General</option>

                            {types.map((type: any) => (
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                          {!x.room_type_id && rt?.name ? (
                            <small className="room-type-note">{rt.name}</small>
                          ) : null}
                        </td>
<<<<<<< HEAD
                        <td>
                          <Badge tone={x.is_active ? 'success' : 'warning'}>
                            {x.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="room-actions-cell">
                          <div className="room-actions">
                            <form id={formId} action={updateRoom}>
                              <input type="hidden" name="room_id" value={x.id} />
                              <button type="submit" className="room-action-btn room-save-btn">
                                Save
                              </button>
                            </form>
                            <form action={setRoomActive}>
                              <input type="hidden" name="room_id" value={x.id} />
                              <input type="hidden" name="is_active" value={String(!x.is_active)} />
=======

                        <td>
                          <Badge tone={x.is_active ? "success" : "warning"}>
                            {x.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="room-actions-cell">
                          <div className="room-actions">
                            <form id={formId} action={updateRoom}>
                              <input
                                type="hidden"
                                name="room_id"
                                value={x.id}
                              />

                              <button
                                type="submit"
                                className="room-action-btn room-save-btn"
                              >
                                Save
                              </button>
                            </form>

                            <form action={setRoomActive}>
                              <input
                                type="hidden"
                                name="room_id"
                                value={x.id}
                              />

                              <input
                                type="hidden"
                                name="is_active"
                                value={String(!x.is_active)}
                              />

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                              <button
                                type="submit"
                                className={
                                  x.is_active
<<<<<<< HEAD
                                    ? 'room-action-btn room-deactivate-btn'
                                    : 'room-action-btn room-activate-btn'
                                }
                              >
                                {x.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </form>
                            <form action={deleteRoom}>
                              <input type="hidden" name="room_id" value={x.id} />
                              <button type="submit" className="room-action-btn room-delete-btn">
=======
                                    ? "room-action-btn room-deactivate-btn"
                                    : "room-action-btn room-activate-btn"
                                }
                              >
                                {x.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </form>

                            <form action={deleteRoom}>
                              <input
                                type="hidden"
                                name="room_id"
                                value={x.id}
                              />

                              <button
                                type="submit"
                                className="room-action-btn room-delete-btn"
                              >
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
<<<<<<< HEAD
                    )
=======
                    );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                  })}
                </tbody>
              </DataTable>
            </div>
          ) : (
            <Empty text="No rooms configured." />
          )}
        </div>
      </section>
<<<<<<< HEAD
      {/* ======================================================
          AVAILABILITY
      ====================================================== */}
=======

      {/* ======================================================
          AVAILABILITY
      ====================================================== */}

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">AVAILABILITY</span>
            <h3>Room Availability</h3>
<<<<<<< HEAD
            <p>Mark semester time windows as available, blocked, or under maintenance.</p>
          </div>
        </div>
=======
            <p>
              Mark semester time windows as available, blocked, or under
              maintenance.
            </p>
          </div>
        </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        <div className="sched-section-body">
          <form action={addRoomAvailability} className="sched-form">
            <div className="sched-form-grid availability-grid">
              <div className="sched-field">
                <label>Room</label>
<<<<<<< HEAD
                <select name="room_id" required>
                  <option value="">Select Room</option>
                  {rooms
                    .filter((x) => x.is_active)
                    .map((x) => (
=======

                <select name="room_id" required>
                  <option value="">Select Room</option>

                  {rooms
                    .filter((x: any) => x.is_active)
                    .map((x: any) => (
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                      <option key={x.id} value={x.id}>
                        {x.code} — {x.name}
                      </option>
                    ))}
                </select>
              </div>
<<<<<<< HEAD
              <div className="sched-field">
                <label>Semester</label>
                <select name="semester_id" defaultValue={activeSemester?.id ?? ''} required>
                  <option value="">Select Semester</option>
                  {semesters.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.is_active ? ' (Active)' : ''}
=======

              <div className="sched-field">
                <label>Semester</label>

                <select
                  name="semester_id"
                  defaultValue={activeSemester?.id ?? ""}
                  required
                >
                  <option value="">Select Semester</option>

                  {semesters.map((x: any) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.is_active ? " (Active)" : ""}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                    </option>
                  ))}
                </select>
              </div>
<<<<<<< HEAD
              <div className="sched-field">
                <label>Day</label>
                <select name="day_of_week" required>
                  <option value="">Select Day</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
=======

              <div className="sched-field">
                <label>Day</label>

                <select name="day_of_week" required>
                  <option value="">Select Day</option>

                  {days.slice(1).map((day, index) => (
                    <option key={day} value={index + 1}>
                      {day}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                    </option>
                  ))}
                </select>
              </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              <div className="sched-field">
                <label>Start</label>
                <input type="time" name="start_time" required />
              </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              <div className="sched-field">
                <label>End</label>
                <input type="time" name="end_time" required />
              </div>
<<<<<<< HEAD
              <div className="sched-field">
                <label>Status</label>
=======

              <div className="sched-field">
                <label>Status</label>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                <select name="status" defaultValue="available">
                  <option value="available">Available</option>
                  <option value="blocked">Blocked</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              <div className="sched-field">
                <label>Reason</label>
                <input name="reason" placeholder="Optional" />
              </div>
            </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
            <div className="sched-form-actions">
              <button type="submit" className="sched-primary-btn">
                Add Availability
              </button>
            </div>
          </form>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
          {availability.length > 0 && (
            <div className="availability-table-wrap">
              <DataTable>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
<<<<<<< HEAD
                <tbody>
                  {availability.map((a) => {
                    const room = rooms.find((x) => x.id === a.room_id)
=======

                <tbody>
                  {availability.map((a: any) => {
                    const room = rooms.find(
                      (x: any) => x.id === a.room_id
                    );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

                    return (
                      <tr key={a.id}>
                        <td>
<<<<<<< HEAD
                          <strong>{room?.code || '—'}</strong>
                        </td>
                        <td>{DAY_NAMES[a.day_of_week] || '—'}</td>
                        <td>
                          {String(a.start_time).slice(0, 5)} – {String(a.end_time).slice(0, 5)}
                        </td>
                        <td>
                          <Badge>{a.status}</Badge>
                        </td>
                        <td>{a.reason || '—'}</td>
                        <td>
                          <form action={removeRoomAvailability}>
                            <input type="hidden" name="availability_id" value={a.id} />
                            <button type="submit" className="sched-secondary-btn">
=======
                          <strong>{room?.code || "—"}</strong>
                        </td>

                        <td>{days[a.day_of_week] || "—"}</td>

                        <td>
                          {String(a.start_time).slice(0, 5)} –{" "}
                          {String(a.end_time).slice(0, 5)}
                        </td>

                        <td>
                          <Badge>{a.status}</Badge>
                        </td>

                        <td>{a.reason || "—"}</td>

                        <td>
                          <form action={removeRoomAvailability}>
                            <input
                              type="hidden"
                              name="availability_id"
                              value={a.id}
                            />

                            <button
                              type="submit"
                              className="sched-secondary-btn"
                            >
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                              Remove
                            </button>
                          </form>
                        </td>
                      </tr>
<<<<<<< HEAD
                    )
=======
                    );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                  })}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      </section>
<<<<<<< HEAD
    </div>
  )
=======

      <style>{`
        .room-table-wrap,
        .availability-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .availability-table-wrap {
          margin-top: 16px;
        }

        .room-directory-table {
          min-width: 1080px;
        }

        .availability-table {
          min-width: 720px;
        }

        .room-table-input,
        .room-table-select {
          width: 100%;
          min-width: 0;
          height: 32px;
          border: 1px solid #d8dee6;
          border-radius: 6px;
          background: #fff;
          padding: 0 8px;
          color: inherit;
          font: inherit;
          outline: none;
        }

        .room-table-input:focus,
        .room-table-select:focus {
          border-color: #8db5de;
        }

        .room-code-input {
          min-width: 82px;
          font-weight: 800;
        }

        .room-name-input {
          min-width: 170px;
        }

        .room-floor-input {
          min-width: 65px;
        }

        .room-capacity-input {
          min-width: 68px;
        }

        .room-table-select {
          min-width: 130px;
        }

        .room-type-note {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 9px;
        }

        .room-actions-cell {
          min-width: 205px;
        }

        .room-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .room-actions form {
          margin: 0;
        }

        .room-action-btn {
          min-height: 30px;
          padding: 0 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .room-save-btn {
          border: 1px solid #8db5de;
          background: #edf5fd;
          color: #175b94;
        }

        .room-deactivate-btn {
          border: 1px solid #e7c46d;
          background: #fffdf5;
          color: #9a6700;
        }

        .room-activate-btn {
          border: 1px solid #9bc9ad;
          background: #f4fbf6;
          color: #24723d;
        }

        .room-delete-btn {
          border: 1px solid #e6b1b1;
          background: #fff7f7;
          color: #b42323;
        }

        @media (min-width: 1051px) {
          .room-create-grid {
            grid-template-columns:
              minmax(105px, 0.8fr)
              minmax(180px, 1.45fr)
              minmax(145px, 1fr)
              minmax(90px, 0.65fr)
              minmax(125px, 0.9fr)
              minmax(90px, 0.65fr);
          }

          .availability-grid {
            grid-template-columns:
              minmax(150px, 1.2fr)
              minmax(150px, 1.1fr)
              minmax(105px, 0.75fr)
              minmax(90px, 0.7fr)
              minmax(90px, 0.7fr)
              minmax(115px, 0.85fr)
              minmax(150px, 1.1fr);
          }

          .room-directory-table th,
          .room-directory-table td,
          .availability-table th,
          .availability-table td {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }

          .room-table-input,
          .room-table-select {
            height: 26px;
            padding: 0 6px;
            border-radius: 5px;
            font-size: 9px;
          }

          .room-actions {
            gap: 3px;
            flex-wrap: nowrap;
          }

          .room-action-btn {
            min-height: 24px;
            height: 24px;
            padding: 0 6px;
            border-radius: 5px;
            font-size: 8px;
          }

          .room-actions-cell {
            min-width: 180px;
          }
        }

        @media (max-width: 700px) {
          .room-actions {
            flex-wrap: wrap;
          }

          .room-action-btn {
            min-height: 32px;
          }
        }
      `}</style>
    </>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}
