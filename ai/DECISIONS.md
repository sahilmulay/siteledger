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

## Dec-006: CashBook UI System & Dual Desktop/Mobile Experience
**Context:** Need an industry-standard, high-legibility digital ledger & khata interface inspired by cashbook.in, supporting both full desktop screens and mobile handheld usage without breaking existing Supabase business logic.
**Decision:** 
- Visual Tokens: Royal Indigo (`#4F46E5`), Emerald Green (`#10B981`) for Cash In, Coral Red (`#EF4444`) for Cash Out, Soft Slate (`#F8FAFC`), Plus Jakarta Sans typography with `tabular-nums` for numeric figures.
- Dual Experience: Built a dedicated Desktop Ledger Dashboard (Sidebar, Omnisearch `Ctrl+K`, 3 summary metric cards with MoM baseline, audit alert strip, and comprehensive data table with pagination) and Mobile Ledger Dashboard (header with live sync, dual pills, daily grouped feed, sticky bottom CTAs, and an Add Transaction Sheet with numeric keypad).
- Added a floating `ViewModeSwitcher` (`Auto`, `Desktop`, `Mobile App`) to allow instantaneous localhost previewing and verification without altering production deployment.
**Status:** Reverted (User preferred original SiteLedger construction ledger UI).

## Dec-007: Rectangular Dashboard Cards & Site Details Simplification
**Context:** The 2-column square/cube cards on mobile caused cramped text and poor legibility for large Indian currency amounts. Furthermore, the "Site Details" screen was complex, with key site area parameters buried at the bottom and redundant expense history and site photos cards on the dashboard.
**Decision:** 
- Converted `StatCard` in `ProjectDashboard.jsx` to full-width horizontal rectangles with left icons, clear numeric values, and right-hand indicators.
- Removed the duplicate "Expense Entries" card (since "Total Expenses" directly accesses the expense history).
- Removed the "Site Photos" card from the dashboard.
- In `SitePlans.jsx`: Reordered sections so "Site Overview" (built-up area & floor breakdown) is at the very top; renamed "Base Construction" to "Construction Cost" and "Estimated Extra Work" to "Extra Work Cost".
**Status:** Implemented.
