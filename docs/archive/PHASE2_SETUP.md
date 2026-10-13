# AlterSched Phase 2 — Authentication Setup

## 1. Database
Run these in Supabase SQL Editor in this order:
1. `AlterSched_Database_V2.sql` (already created previously)
2. `AlterSched_Phase2_Auth_Patch.sql`

Before user registration can show dropdown choices, seed at least:
- institution
- department
- program
- year level
- section

## 2. Environment variables
Copy `.env.local.example` to `.env.local` and paste values from Supabase Project → Connect/API:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

Do not put a service-role key in browser/public environment variables.

## 3. Install + run
npm install
npm run dev

## 4. Bootstrap the first Super Admin
Because self-registration is restricted to Student or Faculty, create the first admin securely:

A. In Supabase Dashboard → Authentication → Users, create the admin user.
B. Then run the following SQL, replacing the email:

```sql
update public.profiles
set role = 'super_admin', account_status = 'approved', updated_at = now()
where email = 'ADMIN_EMAIL_HERE';

insert into public.account_approvals(profile_id, status, reviewed_at, remarks)
select id, 'approved', now(), 'Initial Super Admin bootstrap.'
from public.profiles
where email = 'ADMIN_EMAIL_HERE';
```

If creating the Auth user through the Dashboard does not supply registration metadata, the Phase 2 trigger may reject creation. In that case temporarily create a normal Student/Faculty account through `/register`, then promote that known account with the SQL above. Do not add an admin option to public registration.

## 5. Current milestone behavior
- Student and Faculty can self-register only.
- Accounts start as `pending`.
- Pending/rejected/suspended/inactive users go to `/pending-approval`.
- Approved users route by role.
- Admin/Scheduler portal rejects normal Student/Faculty accounts.
- Role dashboards are server guarded.

## Next milestone
Admin Account Approval UI + Academic Setup management.
