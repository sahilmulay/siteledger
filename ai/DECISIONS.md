# Architecture & Design Decisions (ADR)

This file tracks specific, atomic decisions made during the development of SiteLedger.

## Dec-001: Mobile-First Header Layout
**Context:** App headers were truncating on narrow 360px-390px screens due to the presence of status badges and action buttons.
**Decision:** Adopted a two-row header fallback strategy. The main `h1` title is strictly isolated on the top row to consume maximum width. Secondary items like the project code, `(i)` info button, and status text are shifted to a flexible subtitle row below it.
**Status:** Implemented across all list/dashboard views.

## Dec-002: Client-Side PDF Generation
**Context:** Need for shareable reports, often generated while users are on construction sites with poor network connectivity.
**Decision:** Use `jspdf` and `jspdf-autotable` entirely on the client side. This avoids serverless function timeouts, reduces backend complexity, and ensures offline capability (when combined with PWA caching).
**Status:** Implemented in `src/pages/Reports/`.

## Dec-003: Subtitle-Based Contextual Help (Info Buttons)
**Context:** The client requires brief contextual help on each screen for non-technical users, but without eating up screen real estate.
**Decision:** Implement an `InfoButton` component (a small `(i)` icon). To prevent it from causing title truncation, it is placed on the `subtitle` row. If no subtitle exists on the page, it is appended to the title row where space is ample. 
**Status:** Implemented.

## Dec-004: Global Localization Formatting
**Context:** The application is built for an Indian construction firm (JadhavPatil Construction).
**Decision:** 
- Date format strictly set to `DD/MM/YYYY`.
- Time format set to 12-hour AM/PM.
- Currency formatted universally to `INR` (Indian Rupee) using Indian numbering system (comma placement: 1,00,000).
**Status:** Standardized.

## Dec-005: AI Documentation System
**Context:** Need a way for AI coding assistants to maintain long-term context across multiple sessions, server restarts, and model updates.
**Decision:** Establish an `/ai` directory at the project root containing `PROJECT_RULES.md`, `CURRENT_STATUS.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md`, etc. An explicit rule requires the AI to update `SESSION_CONTEXT.md` after every completed task.
**Status:** Implemented and enforced via `PROJECT_RULES.md`.
