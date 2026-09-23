# SiteLedger

**Production-ready mobile-first PWA for Construction Finance Tracking**

Track project-wise income and expenses for civil engineers, contractors, builders, and site supervisors.

---

## Features

- ✅ Project-wise income & expense tracking
- ✅ Categorized expenses (Labour, Materials, Machinery, Transport, Professional Services, Miscellaneous)
- ✅ Bill image uploads to Supabase Storage
- ✅ PDF report generation (jsPDF)
- ✅ Owner read-only portal via secure share link
- ✅ Google OAuth + Email/Password authentication
- ✅ Row Level Security (RLS) on all tables
- ✅ PWA — installable on Android
- ✅ INR currency formatting + Indian date format
- ✅ Mobile-first responsive design

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 8 |
| Styling | Tailwind CSS v3 |
| Backend | Supabase (Auth + DB + Storage) |
| PDF | jsPDF + jspdf-autotable |
| PWA | vite-plugin-pwa (Workbox) |
| Icons | Lucide React |
| Routing | React Router v7 |
| Forms | React Hook Form |

---

## Quick Start

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor** → New Query
3. Paste and run `supabase/schema.sql`
4. Paste and run `supabase/storage.sql`
5. Go to **Settings → API** → Copy:
   - `Project URL`
   - `anon public` key

### Step 2: Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=SiteLedger
VITE_APP_URL=https://your-deployment-url.vercel.app
```

### Step 3: Install & Run

```bash
npm install
npm run dev
```

App runs at http://localhost:5173

---

## Google OAuth Setup

1. Go to Supabase → **Authentication → Providers → Google**
2. Enable Google provider
3. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
4. Add your Supabase redirect URL to Google OAuth authorized redirect URIs
5. Paste Client ID and Secret into Supabase

---

## Deployment on Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables in Vercel Dashboard or:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Production deploy
vercel --prod
```

> **Important:** Add your Vercel domain to Supabase → **Authentication → URL Configuration → Site URL**

---

## PWA Installation (Android)

1. Open the app in Chrome on Android
2. Tap the browser menu (⋮)
3. Tap "Add to Home screen"
4. App installs as a native-looking app

---

## Project Structure

```
src/
├── components/
│   ├── layout/    # BottomNav, Header, PageWrapper, ProtectedRoute
│   └── ui/        # Button, Card, Badge, Input, Modal, Spinner, EmptyState
├── contexts/
│   └── AuthContext.jsx
├── hooks/
│   ├── useProjects.js
│   ├── useIncome.js
│   └── useExpenses.js
├── lib/
│   ├── supabase.js
│   ├── constants.js   # Categories, Payment Modes
│   ├── formatters.js  # INR, dates
│   └── pdfReport.js   # PDF generation
├── pages/
│   ├── Auth/          # Login, Register
│   ├── Dashboard/     # ProjectDashboard
│   ├── Projects/      # ProjectList, ProjectForm
│   ├── Income/        # IncomeList, AddIncome
│   ├── Expenses/      # ExpenseList, AddExpense
│   ├── Reports/       # ReportsHub, ProjectReports
│   ├── Share/         # OwnerPortal (public)
│   └── Settings/      # Settings
├── App.jsx
└── main.jsx
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `projects` | All construction projects per user |
| `income` | Money received from owners |
| `expenses` | All project expenses |
| `worker_attendance` | Future: Worker tracking |
| `material_inventory` | Future: Material tracking |
| `site_diary` | Future: Daily logs |

---

## Security

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Owner portal uses SECURITY DEFINER functions — read-only, no auth required
- Bill images follow path pattern: `{user_id}/{project_id}/{filename}`
- Environment variables are never exposed to the public

---

## Owner Portal

Each project gets a unique share link:
```
https://your-app.vercel.app/share/{share_token}
```

The token is a UUID stored in the `projects.share_token` column.
The portal is strictly read-only and uses SECURITY DEFINER RPC functions.

---

## Future Modules (Database Ready)

Tables already created:
- `worker_attendance` — Worker attendance tracking
- `material_inventory` — Material stock management
- `site_diary` — Daily site logs

Planned:
- GST Reports
- WhatsApp Report Sharing
- Push Notifications
- Contractor Ledger

---

## Commands

```bash
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
```

---

*Built with SiteLedger · Construction Finance Tracker*
