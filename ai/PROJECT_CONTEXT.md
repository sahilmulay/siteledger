# Project Context: SiteLedger

## Project Purpose
SiteLedger is a mobile-first construction management web application designed for general contractors (specifically JadhavPatil Construction). It helps track project progress, financials (income and expenses), site plans, and photos. The primary goal is to simplify on-site financial tracking and provide easily accessible, shareable PDF reports to clients and stakeholders.

## Tech Stack
- **Frontend**: React 19, Vite, React Router 7
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage)
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Form Handling**: React Hook Form
- **State/Notifications**: React Hot Toast
- **PWA**: vite-plugin-pwa

## Architecture Overview
The application is a Single Page Application (SPA) structured as follows:
- `src/components/`: Reusable UI components (`layout`, `ui`).
- `src/pages/`: Feature-specific modules (`Dashboard`, `Projects`, `Income`, `Expenses`, `Reports`, `SitePhotos`, `SitePlans`, `Settings`).
- `src/hooks/`: Custom data fetching and mutation hooks interacting with Supabase.
- `src/contexts/`: React Context providers (e.g., AuthContext).
- `src/lib/`: Utility functions (formatters, Supabase client).

## Main Features
- **Project Tracking**: Multi-project dashboard with running balances.
- **Financial Ledgers**: Track income (advances/stage payments) and categorized expenses (materials, labor, etc.).
- **Visual Analytics**: Interactive pie charts for expense breakdown.
- **Reporting**: PDF generation for income/expense statements and overall project summaries.
- **Site Media**: Photo diary and blueprint/plan uploads via Supabase Storage.
- **PWA Capabilities**: Installable on mobile devices as a Progressive Web App.

## Database Information (Supabase)
- **Authentication**: Email/Password.
- **Tables**: `projects`, `income`, `expenses`, `vendors`, `categories`. Row Level Security (RLS) restricts access by user.
- **Storage**: Buckets for `project-files` (photos, plans) and receipts/invoices.

## External Services/APIs
- Supabase (Backend-as-a-Service)
- Vercel Web Analytics
