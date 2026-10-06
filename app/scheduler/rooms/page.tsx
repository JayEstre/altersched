import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/data-table';
import { PageHead, Empty, Stat, Badge } from '@/components/ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getHeatTone(count: number) {
  if (count >= 3) return 'heat-high';
  if (count >= 1) return 'heat-mid';
  return 'heat-low';
}

function toDayLabel(day: number | null | undefined) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels[(Number(day ?? 1) || 1) - 1] || 'Day';
}

export default async function Page() {
  await requireRole(['department_scheduler']);

  const s = await createClient();

  const [roomsResult, schedulesResult] = await Promise.all([
    s.from('rooms').select('id,code,name,capacity,building').eq('is_active', true).order('code'),
    s.from('schedules').select('id,current_version_id,status').eq('status', 'published'),
  ]);

  const rooms = roomsResult.data ?? [];
  const publishedSchedules = schedulesResult.data ?? [];
  const versionIds = publishedSchedules.map((item: any) => item.current_version_id).filter(Boolean);

  let entries: any[] = [];

  if (versionIds.length) {
    const entriesResult = await s
      .from('schedule_entries')
      .select('id, room_id, day_of_week, start_time, end_time')
      .in('schedule_version_id', versionIds);

    entries = entriesResult.data ?? [];
  }

  const roomUsage = new Map<string, { count: number; days: Set<number>; byDay: Record<number, number> }>();

  for (const entry of entries) {
    const roomId = entry.room_id;
    if (!roomId) continue;

    const current = roomUsage.get(roomId) ?? { count: 0, days: new Set<number>(), byDay: {} };
    current.count += 1;
    if (entry.day_of_week) {
      const dayNumber = Number(entry.day_of_week);
      current.days.add(dayNumber);
      current.byDay[dayNumber] = (current.byDay[dayNumber] ?? 0) + 1;
    }
    roomUsage.set(roomId, current);
  }

  const roomRows = rooms.map((room: any) => {
    const usage = roomUsage.get(room.id) ?? { count: 0, days: new Set<number>(), byDay: {} };
    return {
      ...room,
      utilization: usage.count,
      days: Array.from(usage.days).sort((a, b) => a - b),
      byDay: usage.byDay,
    };
  });

  const avgCapacity = rooms.length ? Math.round(rooms.reduce((sum, room: any) => sum + Number(room.capacity ?? 0), 0) / rooms.length) : 0;
  const highUse = roomRows.filter((room) => room.utilization >= 3).length;
  const lowUse = roomRows.filter((room) => room.utilization === 0).length;

  return (
    <>
      <PageHead
        eyebrow="RESOURCES"
        title="Rooms"
        description="Room inventory and current utilization across active published scheduling blocks."
      />

      <div className="stats-grid">
        <Stat label="Active Rooms" value={rooms.length} hint="Available for scheduling" />
        <Stat label="Avg Capacity" value={avgCapacity} hint="Average room seats" />
        <Stat label="High-use Rooms" value={highUse} hint="Used in 3+ slots" />
        <Stat label="Unused Rooms" value={lowUse} hint="No bookings yet" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Room usage by day</h3>
            <p>Quick view of booking intensity across the working week for the most active rooms.</p>
          </div>
        </div>

        <div className="room-heatmap">
          {roomRows.slice(0, 6).map((room) => (
            <div key={room.id} className="room-heat-card">
              <div className="room-heat-header">
                <strong>{room.code}</strong>
                <span>{room.utilization} bookings</span>
              </div>

              <div className="room-heat-days">
                {DAYS.map((label, index) => {
                  const dayNumber = index + 1;
                  const value = room.byDay?.[dayNumber] ?? 0;
                  return (
                    <div key={`${room.id}-${dayNumber}`} className={`heat-cell ${getHeatTone(value)}`} title={`${label}: ${value} booking${value === 1 ? '' : 's'}`}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Room utilization</h3>
            <p>Current room booking intensity based on active published schedule entries.</p>
          </div>
        </div>

        {roomRows.length ? (
          <DataTable minWidth={760}>
            <thead>
              <tr>
                <th>Room</th>
                <th>Name</th>
                <th>Building</th>
                <th>Capacity</th>
                <th>Bookings</th>
                <th>Days Used</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roomRows.map((room) => {
                const tone = room.utilization >= 3 ? 'success' : room.utilization > 0 ? 'info' : 'warning';
                return (
                  <tr key={room.id}>
                    <td>{room.code}</td>
                    <td>{room.name}</td>
                    <td>{room.building || '—'}</td>
                    <td>{room.capacity} seats</td>
                    <td>{room.utilization}</td>
                    <td>{room.days.length ? room.days.map((day: number) => toDayLabel(day)).join(', ') : '—'}</td>
                    <td><Badge tone={tone}>{room.utilization > 0 ? 'In use' : 'Unassigned'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No rooms configured for scheduling." />
        )}
      </div>

      <style>{`
        .room-heatmap {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .room-heat-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
        }

        .room-heat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 12px;
        }

        .room-heat-header span {
          color: var(--text-muted);
        }

        .room-heat-days {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
        }

        .heat-cell {
          display: grid;
          justify-items: center;
          gap: 4px;
          padding: 8px 4px;
          border-radius: 8px;
          border: 1px solid var(--line);
          font-size: 9px;
          text-align: center;
        }

        .heat-cell strong {
          font-size: 12px;
        }

        .heat-low {
          background: rgba(148, 163, 184, 0.08);
        }

        .heat-mid {
          background: rgba(59, 130, 246, 0.12);
        }

        .heat-high {
          background: rgba(34, 197, 94, 0.14);
        }
      `}</style>
    </>
  );
}

