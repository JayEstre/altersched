# AlterSched V4 — UI/UX & Code Quality Refactor

## Scope
This pass intentionally preserves existing routes, Supabase queries, authentication/role guards, schedule-generation logic, publishing, QR claiming, imports, and database behavior. Changes focus on shared presentation, navigation structure, maintainability, accessibility, and visible dashboard usability.

## Changes made
- Centralized Admin, Scheduler, Faculty, and Student navigation in `lib/navigation.ts`.
- Added semantic Lucide icons and stronger active-route states to shared portal navigation.
- Restored signed-in user identity to both the sidebar and desktop topbar using the `name` and `email` values that layouts were already passing but the shell was not displaying.
- Added a compact account card and clearer sign-out area.
- Improved responsive portal shell, dashboard hierarchy, spacing, focus visibility, reduced-motion behavior, cards, tables, and buttons.
- Enhanced the Admin dashboard with meaningful stat icons/hints and three direct quick actions without changing the underlying queries.
- Replaced the placeholder `A` empty-state graphic with a reusable semantic empty-state icon.
- Added ESLint 9 flat configuration (`eslint.config.mjs`) compatible with the project's Next.js 16 / TypeScript setup.
- Consolidated duplicated navigation arrays out of individual role layouts.

## Deliberately not rewritten in this pass
Large scheduling/action modules contain core scheduling behavior. They should be decomposed only with a regression-test harness around conflict detection, schedule generation, versioning, publication, and alteration flows. Splitting them merely to reduce line count would increase regression risk.

## Local verification
Run:

```powershell
npm install
npm run lint
npm run build
```

If lint reports pre-existing rule violations in feature modules, fix those separately from this UI refactor so behavioral changes remain reviewable.
