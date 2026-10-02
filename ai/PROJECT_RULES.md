# Project Rules & Guidelines

## 🤖 AI Update Process
**CRITICAL INSTRUCTION FOR ALL AI ASSISTANTS:**
Any time a code change is made, or a task is completed, you MUST automatically update the following files in this `/ai` directory:
1. `SESSION_CONTEXT.md` - MUST be updated after EVERY completed task to reflect the current state, focus, and next steps.
2. `CHANGELOG.md` - Log the changes made, categorized by `Added`, `Changed`, `Fixed`, or `Removed`.
3. `CURRENT_STATUS.md` - Update the "Completed", "In Progress", or "Known Issues" sections if the task changes the state of the project.
4. `AI_MEMORY.md` - Update ONLY if the task involved an architectural decision, security fix, or major performance optimization.
5. `DECISIONS.md` - Update ONLY when a new distinct architectural, technical, or design decision is made.

## Documentation Governance
- The `/ai` directory is the project's single source of truth.
- Documentation is part of the architecture.
- Documentation must always be updated alongside code changes.
- Historical decisions must never be deleted.
- Documentation should remain concise, factual, and current.

## Pre-Modification Process
Before modifying ANY code:
1. Read every file inside `/ai`.
2. Summarize project understanding.
3. Identify affected components/files.
4. Verify compatibility with:
   - Existing architecture
   - Client requirements
   - Previous decisions
   - Security constraints
   - Mobile-first requirements
5. Make the requested changes.
6. Update documentation.
7. Verify documentation accuracy before completing the task.

*Failure to follow this process should be treated as a project rule violation.*

## UI/UX Rules
- **Mobile-First Exclusivity**: ALL UI changes must be strictly tailored for and tested against mobile view (narrow widths: 360px–390px). 
- **Header Space**: Never crowd the `Header` component. Use the `subtitle` row for elements like `InfoButton` to ensure main titles (`h1`) have 100% available horizontal space and never truncate.
- **Spacing Guidelines**: Use compact padding on mobile view, expanding slightly on larger screens (e.g., `p-1.5 sm:p-2`, `gap-1 sm:gap-1.5`).
- **Contextual Help**: Include small `(i)` buttons (InfoButton component) in corners to explain the current section to new users in simple English.

## Coding Conventions
- **Date Format**: DD/MM/YYYY globally across the app.
- **Time Format**: 12-hour format with AM/PM.
- **Currency**: INR formatting for all monetary values.
- **Component Structure**: Functional components with hooks. Prefer composition (e.g., wrapping `PageWrapper` or `Card`).
- **Imports**: Use relative imports for local modules. 

## Architecture Constraints
- **State Management**: Prefer local component state or React Context (`AuthContext`) over Redux/Zustand unless complexity dictates otherwise.
- **Database Access**: All queries must pass through custom hooks in `src/hooks/` to abstract the Supabase client logic.

## Important Do-Not-Break Areas
- **PDF Generation**: `jspdf` logic is highly sensitive to layout changes. Ensure `jsPDF-AutoTable` configurations match the current view.
- **Supabase Auth & RLS**: Never bypass Row Level Security. Ensure all queries filter by the authenticated user's ID.
- **PWA Configuration**: `vite-plugin-pwa` settings (`manifest`, `sw`) govern mobile installation; modify carefully.
