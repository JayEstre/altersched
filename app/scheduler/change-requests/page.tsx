<<<<<<< HEAD
import { redirect } from 'next/navigation'

// Alteration requests are reviewed (approved/rejected) on /scheduler/alterations.
// This older read-only list is kept as a redirect so existing links still work.
export default function Page() {
  redirect('/scheduler/alterations')
}
=======
import {createClient} from '@/lib/supabase/server';
import { DataTable } from '@/components/data-table';
import {PageHead,Stat,Empty,Badge} from '@/components/ui'
export default async function Page(){const s=await createClient();
const {data}=await s.from('schedule_change_requests').select('id,reason,status,change_type,created_at,profiles!schedule_change_requests_requested_by_fkey(full_name),schedule_entries(day_of_week,start_time,end_time)').order('created_at',{ascending:false});
return <><PageHead eyebrow="ALTERATIONS" title="Schedule Alterations" description="Review faculty schedule-change requests before approved changes become a new schedule version."/><div className="stats-grid"><Stat label="Requests" value={data?.length||0}/><Stat label="Pending" value={data?.filter((x:any)=>x.status==='pending').length||0}/></div><div className="panel">{data?.length?<DataTable><thead><tr><th>Requested By</th><th>Reason</th><th>Type</th><th>Status</th></tr></thead><tbody>{data.map((x:any)=><tr key={x.id}><td>{x.profiles?.[0]?.full_name||'—'}</td><td>{x.reason}</td><td>{x.change_type}</td><td><Badge>{x.status}</Badge></td></tr>)}</tbody></DataTable>:<Empty text="No schedule alteration requests."/>}</div></>}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
