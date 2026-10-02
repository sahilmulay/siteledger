# Client Requirements

## Business Requirements
- The app must serve as a portable digital ledger for construction sites.
- It must replace manual diary keeping for cash flow, vendor payments, and daily expenses.
- The firm name (e.g., JadhavPatil Construction) should easily reflect on client-facing documents.
- PDFs must be easily shareable via WhatsApp directly from the app.

## User-Facing Requirements
- **Mobile First**: The primary target device is a smartphone used in the field. Desktop optimization is secondary. All UI must fit without horizontal scrolling on 360px screens.
- **Project Codes**: New projects should automatically receive incremental identifiers (PR01, PR02, etc.) while allowing manual edits.
- **Formatting**:
  - Dates: DD/MM/YYYY.
  - Times: 12-hour format with AM/PM.
  - Numbers: Comma formatting for INR (Indian Rupee) as the user types.
- **Guidance**: Include small `(i)` buttons in the corners of sections providing simple English explanations for new users.
- **Header Clarity**: Never show truncated headers (`...`). Action buttons or badges must be hidden or shifted to secondary rows if they threaten title visibility.
- **Visibility**: Display total construction cost with a detailed formula breakdown via information modals.
