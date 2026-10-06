# AlterSched Project Audit — 2026-10-06

## Fixed high-impact issues

### 1. Import / Export workflow pointed to a non-existent route tree
**Root cause:** The UI was moved to `app/admin/import-export`, and the admin sidebar correctly linked to `/admin/import-export`, but the pages, forms, route handlers, redirects, and server action revalidation still referenced the old `/admin/import` paths.

**Impact:** Upload, conversion, preview, mapping, review, confirmation, template download, error redirects, and post-import navigation could return 404s or leave the user outside the actual module.

**Fix:** Normalized the complete module to `/admin/import-export` and its child routes.

### 2. `pdf-parse` v2 import/API mismatch
**Root cause:** `pdf-parse@^2.4.5` no longer exposes the old default callable parser used by the route (`import pdfParse from 'pdf-parse'; await pdfParse(buffer)`).

**Impact:** TypeScript error TS1192 and PDF conversion could not compile/run.

**Fix:** Migrated to the v2 `PDFParse` class, `getText()`, and `destroy()` lifecycle.

### 3. Approved students could not reach the student portal after login
**Root cause:** `destinationFor()` declared `student` as a valid role but had no student destination. All approved students fell through to `/login?error=role_not_supported`.

**Impact:** Correctly authenticated and approved student accounts were effectively locked out despite a complete `/student` portal and `requireRole(['student'])` layout.

**Fix:** Added the missing `/student/dashboard` destination.

### 4. Duplicate auth guard implementation
**Root cause:** `lib/auth/guard.ts` and `lib/auth/require-role.ts` contained the exact same implementation, while the application imports `require-role.ts`.

**Impact:** Maintenance risk: future security/auth changes could be made to one copy and not the other.

**Fix:** Removed the unused duplicate `lib/auth/guard.ts` and retained the canonical `lib/auth/require-role.ts`.

### 5. Incorrect role documentation in code
**Root cause:** A comment said `student` was only a legacy database value, but the official V2 schema defines it in `public.user_role` and the application actively implements the student portal.

**Impact:** Encouraged future developers to remove or mishandle a live role.

**Fix:** Replaced the misleading comment with an explicit schema-alignment note.

## Architecture / maintainability findings

- `app/scheduler/schedule-builder/actions.ts` and `app/admin/schedule-builder/actions.ts` are very large server-action modules. They are not safe to blindly deduplicate because admin and scheduler authorization/scope differ, but shared scheduling primitives should eventually be extracted into `lib/scheduling/*` with role-specific orchestration kept in each action module.
- The project contains several historical SQL patches/setup documents alongside `database/AlterSched_Database_V2.sql`. Keep V2 as the baseline and clearly mark patches by required execution order; do not merge/delete SQL files without validating the deployed Supabase migration state.
- There is extensive use of `any` around Supabase relation results. This is not automatically broken, but it weakens compile-time protection against the exact relation-shape errors previously seen in the project. A generated Supabase `Database` type would substantially reduce this class of bug.

## Verification note

Static consistency checks were performed on the repaired route references and source edits. A clean dependency reinstall/build could not be completed inside the execution sandbox because `npm install/npm ci` repeatedly exceeded the environment transport timeout. Run the following locally after extracting the repaired project:

```bash
npm install
npm run build
npm run lint
```

If the existing `node_modules` directory is stale or corrupted, remove it first, then run `npm install` again.
