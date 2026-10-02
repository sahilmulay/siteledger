# AI Memory & Architectural Decisions

## Architectural Decisions
- **Vite + React (SPA)**: Chosen over Next.js/SSR because the app requires deep PWA capabilities and offline-ready features suitable for construction sites with poor connectivity.
- **Supabase**: Selected as a BaaS to rapidly handle Postgres, Auth, and Storage. Replaces the need for a custom Node/Express backend.
- **Tailwind CSS**: Used for highly responsive, inline utility styling ensuring mobile-first constraints are met quickly without bulky CSS files.

## Technical Choices & Reasons
- **PDF Generation via Client**: `jspdf` and `jspdf-autotable` are executed on the client-side to minimize server costs and allow instant generation even under spotty networks, rather than using a headless browser on a server.
- **Mobile Headers**: Instead of keeping all badges and buttons on a single flex row, the `Header` component smartly falls back to a 2-row layout. `h1` titles are isolated on the top row, and secondary metadata (`subtitle`, `InfoButton`) lives on the bottom row. This solves the persistent issue of title truncation on 360px screens.

## Security Decisions (Audit Findings)
- **Storage Buckets**: Originally permissive to any authenticated user. *Requirement*: Enforce strictly scoped RLS on buckets based on user UID or `projects` table ownership.
- **Auth State Clear**: Identified that LocalStorage keys for vendor names leaked between logged-out/logged-in sessions on the same browser. *Requirement*: Scope persisted data to authenticated UID or explicitly wipe on `logout`.
- **PWA Cache Security**: Workbox was caching API calls. *Requirement*: Enforce `NetworkOnly` for Supabase API routes to prevent sensitive financial data lingering in CacheStorage after logout.

## Performance Optimizations
- Debounced search inputs.
- Compacted SVG icons (Lucide React) rather than heavy icon libraries.

## Lessons Learned
- **Mobile Padding matters**: Standard `p-2` padding and `gap-3` create unresolvable space constraints on small iPhones/Androids. Variable padding (`px-3 sm:px-4`, `p-1.5 sm:p-2`) is mandatory for headers with action buttons.
