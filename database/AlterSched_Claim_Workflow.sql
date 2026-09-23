-- Secure raw-code claim wrapper. Run after AlterSched_Database_V2.sql.
begin;
create or replace function public.claim_schedule_with_code(p_raw_code text,p_claim_method public.claim_method default 'code') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_hash text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if coalesce(trim(p_raw_code),'')='' then raise exception 'Schedule access code is required'; end if;
 v_hash:=encode(digest(upper(trim(p_raw_code)),'sha256'),'hex');
 if p_claim_method='qr' then select id into v_id from public.schedule_access_codes where qr_token_hash=v_hash and active=true and revoked_at is null limit 1;
 else select id into v_id from public.schedule_access_codes where code_hash=v_hash and active=true and revoked_at is null limit 1; end if;
 if v_id is null then raise exception 'Invalid or inactive schedule access code'; end if;
 return public.claim_schedule(v_id,p_claim_method);
end;$$;
grant execute on function public.claim_schedule_with_code(text,public.claim_method) to authenticated;
commit;
