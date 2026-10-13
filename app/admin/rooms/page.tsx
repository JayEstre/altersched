import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge, Notice } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import {
  createRoom,
  updateRoom,
  setRoomActive,
  deleteRoom,
  addRoomAvailability,
  removeRoomAvailability,
} from './actions'
import { DAY_NAMES, DAY_OPTIONS } from '@/lib/format'
import styles from './page.module.css'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
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
      <PageHead
        eyebrow="RESOURCES"
        title="Rooms & Labs"
        description="Manage rooms, laboratories, capacities, types, status, and semester availability used by the scheduling engine."
      />
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
      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">ROOM SETUP</span>
            <h3>Add Room / Laboratory</h3>
            <p>
              Create a schedulable room or laboratory and define its capacity, type, building, and
              floor.
            </p>
          </div>
        </div>
        <div className="sched-section-body">
          <form action={createRoom} className="sched-form">
            <div className="sched-form-grid room-create-grid">
              <div className="sched-field">
                <label>Room Code</label>
                <input name="code" placeholder="e.g. LAB 1" autoComplete="off" required />
              </div>
              <div className="sched-field">
                <label>Name</label>
                <input
                  name="name"
                  placeholder="e.g. Computer Laboratory 1"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="sched-field">
                <label>Room Type</label>
                <select name="room_type_id">
                  <option value="">General / Unspecified</option>
                  {types.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
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
            <div className="sched-form-actions">
              <button type="submit" className="sched-primary-btn">
                Create Room
              </button>
            </div>
          </form>
        </div>
      </section>
      {/* ======================================================
          ROOM DIRECTORY / EDIT
      ====================================================== */}
      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">ROOM DIRECTORY</span>
            <h3>Configured Rooms</h3>
            <p>
              Edit room information directly from the table. Inactive rooms remain visible so they
              can be reactivated later.
            </p>
          </div>
          <Badge>{rooms.length} Total</Badge>
        </div>
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
                <tbody>
                  {rooms.map((x) => {
                    const rt = Array.isArray(x.room_types) ? x.room_types[0] : x.room_types
                    const formId = `room-update-${x.id}`

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
                        <td>
                          <input
                            form={formId}
                            className="room-table-input room-name-input"
                            name="name"
                            defaultValue={x.name}
                            required
                          />
                        </td>
                        <td>
                          <input
                            form={formId}
                            className="room-table-input"
                            name="building"
                            defaultValue={x.building ?? ''}
                            placeholder="—"
                          />
                        </td>
                        <td>
                          <input
                            form={formId}
                            className="room-table-input room-floor-input"
                            name="floor"
                            defaultValue={x.floor ?? ''}
                            placeholder="—"
                          />
                        </td>
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
                        <td>
                          <select
                            form={formId}
                            className="room-table-select"
                            name="room_type_id"
                            defaultValue={x.room_type_id ?? ''}
                          >
                            <option value="">General</option>
                            {types.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                          {!x.room_type_id && rt?.name ? (
                            <small className="room-type-note">{rt.name}</small>
                          ) : null}
                        </td>
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
                              <button
                                type="submit"
                                className={
                                  x.is_active
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
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </DataTable>
            </div>
          ) : (
            <Empty text="No rooms configured." />
          )}
        </div>
      </section>
      {/* ======================================================
          AVAILABILITY
      ====================================================== */}
      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">AVAILABILITY</span>
            <h3>Room Availability</h3>
            <p>Mark semester time windows as available, blocked, or under maintenance.</p>
          </div>
        </div>
        <div className="sched-section-body">
          <form action={addRoomAvailability} className="sched-form">
            <div className="sched-form-grid availability-grid">
              <div className="sched-field">
                <label>Room</label>
                <select name="room_id" required>
                  <option value="">Select Room</option>
                  {rooms
                    .filter((x) => x.is_active)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.code} — {x.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="sched-field">
                <label>Semester</label>
                <select name="semester_id" defaultValue={activeSemester?.id ?? ''} required>
                  <option value="">Select Semester</option>
                  {semesters.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.is_active ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sched-field">
                <label>Day</label>
                <select name="day_of_week" required>
                  <option value="">Select Day</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sched-field">
                <label>Start</label>
                <input type="time" name="start_time" required />
              </div>
              <div className="sched-field">
                <label>End</label>
                <input type="time" name="end_time" required />
              </div>
              <div className="sched-field">
                <label>Status</label>
                <select name="status" defaultValue="available">
                  <option value="available">Available</option>
                  <option value="blocked">Blocked</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="sched-field">
                <label>Reason</label>
                <input name="reason" placeholder="Optional" />
              </div>
            </div>
            <div className="sched-form-actions">
              <button type="submit" className="sched-primary-btn">
                Add Availability
              </button>
            </div>
          </form>
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
                <tbody>
                  {availability.map((a) => {
                    const room = rooms.find((x) => x.id === a.room_id)

                    return (
                      <tr key={a.id}>
                        <td>
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
                              Remove
                            </button>
                          </form>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
