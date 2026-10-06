'use server'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {requireRole} from '@/lib/auth/require-role'
import {createClient} from '@/lib/supabase/server'
const v=(fd:FormData,k:string)=>String(fd.get(k)??'').trim()
export async function submitChangeRequest(fd:FormData){
 const {profile}=await requireRole(['faculty']); const s=await createClient()
 const entryId=v(fd,'schedule_entry_id'), reason=v(fd,'reason'), type=v(fd,'change_type')||'normal_request'
 const day=v(fd,'proposed_day'), start=v(fd,'proposed_start_time'), end=v(fd,'proposed_end_time'), room=v(fd,'proposed_room_id')
 if(!entryId||!reason) redirect('/faculty/change-requests?error=Entry+and+reason+are+required')
 const {data:fp}=await s.from('faculty_profiles').select('id').eq('profile_id',profile.id).maybeSingle()
 if(!fp) redirect('/faculty/change-requests?error=Faculty+profile+not+found')
 const {data:entry}=await s.from('schedule_entries').select('id').eq('id',entryId).eq('faculty_id',fp.id).maybeSingle()
 if(!entry) redirect('/faculty/change-requests?error=You+can+only+request+changes+to+your+own+classes')
 if(start&&end&&end<=start) redirect('/faculty/change-requests?error=End+time+must+be+later+than+start+time')
 const {error}=await s.from('schedule_change_requests').insert({schedule_entry_id:entryId,requested_by:profile.id,reason,change_type:type,proposed_day:day?Number(day):null,proposed_start_time:start||null,proposed_end_time:end||null,proposed_room_id:room||null,status:'pending'})
 if(error) redirect(`/faculty/change-requests?error=${encodeURIComponent(error.message)}`)
 revalidatePath('/faculty/change-requests');redirect('/faculty/change-requests?success=submitted')
}
