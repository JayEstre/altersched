'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
export async function claimScheduleByCode(formData:FormData){
 await requireRole(['student']); const s=await createClient(); const raw=String(formData.get('code')??'').trim(); if(!raw) redirect('/student/schedule/qr?error=code_required')
 const {data,error}=await s.rpc('claim_schedule_with_code',{p_raw_code:raw,p_claim_method:'code'})
 if(error) redirect(`/student/schedule/qr?error=claim_failed&details=${encodeURIComponent(error.message)}`)
 revalidatePath('/student/schedule'); revalidatePath('/student/dashboard'); redirect(`/student/schedule/qr?success=claimed&id=${encodeURIComponent(String(data??''))}`)
}
