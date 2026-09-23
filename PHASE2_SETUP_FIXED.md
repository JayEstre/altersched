# AlterSched Phase 2 - Fixed Setup

1. Run `AlterSched_Database_V2.sql` once on the fresh Supabase project.
2. Run `AlterSched_Phase2_Auth_Fix_All.sql` after V2. It is safe even if the older Phase 2 patch was already run.
3. Copy `.env.local.example` to `.env.local` and add the real Supabase URL and publishable key.
4. Run `npm install` then `npm run dev`.
5. Student/Faculty registration uses the `@/` alias configured in `tsconfig.json`.
6. To create the first Super Admin: Supabase Authentication > Users > Add User (Auto Confirm ON). This corrected trigger allows manual users with no academic metadata. Then promote that UUID using the bootstrap SQL at the bottom of the fix file.
