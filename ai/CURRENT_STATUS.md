# Current Status

## Completed Features
- Setup of React + Vite + Tailwind + PWA stack.
- Supabase Authentication integration.
- Dashboard with multi-project overview.
- Automatic Project Code generation (e.g., PR01, PR02).
- Income and Expense tracking with vendor/category management.
- PDF Report generation for individual projects and summary hubs.
- Site Photos and Site Plans (blueprint) storage.
- Strict mobile UI layout optimizations (header truncations resolved, compact action buttons).
- Information tooltips for all main screens.
- Dashboard Rectangular Cards Layout (replaced small cube cards with wide horizontal rectangles for mobile view).
- Site Details Simplification (Site Overview moved to top, Base Construction renamed to Construction Cost, Estimated Extra Work renamed to Extra Work Cost, and expense history/site photos removed from dashboard).

## Features In Progress
- Resolving security audit findings related to Supabase caching and storage access (CodeRabbit report).
- Addressing pagination limits (fetching >1000 rows for bulk PDF reports).

## Known Issues
- **PWA Cache Persistence**: Service worker retains private API responses after logout (identified in security audit). Needs strict `NetworkOnly` policies for auth/private routes or cache clearing on logout.
- **Storage Authorization**: Storage RLS policies need stricter `owner` checks rather than just `authenticated` (identified in security audit).
- **Pagination**: Backups and complete reports currently cap at 1,000 rows per Supabase defaults. Needs database aggregates or paginated fetching loops.

## Pending Improvements
- Enhancing offline sync capabilities for poor network conditions at construction sites.
- Fixing vendor/category local storage leakage between accounts on shared devices.
