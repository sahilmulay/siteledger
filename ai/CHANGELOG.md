# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Changed
- Dashboard Cards Redesign: Transformed `ProjectDashboard` stat cards from small 2-column square cubes into horizontal rectangular cards with clear numeric legibility for mobile screens.
- Site Details Simplification (`SitePlans.jsx`):
  - Moved **Site Overview** card (built-up area and floor breakdown) to the very top.
  - Renamed all "Base Construction" / "Base Construction Cost" references to **"Construction Cost"**.
  - Renamed all "Estimated Extra Work" / "Estimated Charges for Extra Work" references to **"Extra Work Cost"**.
  - Simplified card layouts and calculation formulas.

### Removed
- Removed duplicate "Expense Entries" (expense history) card from the main dashboard.
- Removed "Site Photos" card from the main dashboard as instructed.

### Fixed
- UI Mobile Optimizations:
  - Removed the "Active" status badge from `ProjectDashboard` header to free horizontal space.
  - Repositioned the `(i)` InfoButton into the subtitle row across headers (Income, Expenses, Dashboard) to prevent main title truncation.
  - Compacted right-action header buttons padding (`p-1.5 sm:p-2`) and gaps (`gap-1 sm:gap-1.5`) across all list views to maximize header title space on 360px-390px screens.

### Removed
- Reverted the experimental CashBook UI redesign as per user request ("no change and lets get back to our old ui").
- Restored the original SiteLedger construction management UI, layouts, dashboard cards, navigation, and color scheme.
- Removed temporary CashBook components (`src/components/cashbook/`).

### Changed
- Date formats standardized globally to `DD/MM/YYYY`.
- Time formats standardized to 12-hour AM/PM.
- Automated project code assignment incrementally on creation (PR01, PR02).
- Expanded AI Memory System maintenance protocol with explicit file-by-file update triggers and ADR formatting rules.

### Baseline
- Initial tracking baseline established for AI memory and state tracking.
