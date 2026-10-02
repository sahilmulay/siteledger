# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed
- UI Mobile Optimizations:
  - Removed the "Active" status badge from `ProjectDashboard` header to free horizontal space.
  - Repositioned the `(i)` InfoButton into the subtitle row across headers (Income, Expenses, Dashboard) to prevent main title truncation.
  - Compacted right-action header buttons padding (`p-1.5 sm:p-2`) and gaps (`gap-1 sm:gap-1.5`) across all list views to maximize header title space on 360px-390px screens.

### Changed
- Date formats standardized globally to `DD/MM/YYYY`.
- Time formats standardized to 12-hour AM/PM.
- Automated project code assignment incrementally on creation (PR01, PR02).

### Baseline
- Initial tracking baseline established for AI memory and state tracking.
