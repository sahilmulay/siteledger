# Database Schema

This document outlines the Supabase PostgreSQL database schema for SiteLedger.

## Core Tables

### `projects`
Stores all construction projects/sites managed by the user.
- **`id`** (`uuid`, Primary Key)
- **`user_id`** (`uuid`, Foreign Key to `auth.users`) - Owner of the project.
- **`project_code`** (`text`) - Unique code per user (e.g., PR01).
- **`project_name`** (`text`) - Name of the site/project.
- **`owner_name`** (`text`) - Client's name.
- **`owner_mobile`** (`text`) - Client's contact number.
- **`site_address`** (`text`)
- **`project_status`** (`text`) - 'Active', 'Completed', or 'On Hold'.
- **`share_token`** (`uuid`, Unique) - Token for public client sharing.
- **`start_date`** (`date`)
- **`total_area`** (`numeric`) - Used for budget calculations.
- **`number_of_floors`** (`integer`)
- **`floor_areas`** (`jsonb`)
- **`rate_per_sqft`** (`numeric`) - Used to calculate estimated cost.
- **`extra_works`** (`jsonb`)
- **`notes`** (`text`)
- **`metadata`** (`jsonb`)

### `income`
Tracks advances and stage payments received from clients for a specific project.
- **`id`** (`uuid`, Primary Key)
- **`project_id`** (`uuid`, Foreign Key to `projects`)
- **`amount`** (`numeric(12,2)`)
- **`payment_mode`** (`text`) - E.g., 'Cash', 'UPI', 'Cheque', 'Bank Transfer'.
- **`transaction_reference`** (`text`) - Cheque No. / UPI ID.
- **`date`** (`date`)
- **`remarks`** (`text`)

### `expenses`
Tracks all site expenditures including materials, labor, machinery, and miscellanous costs.
- **`id`** (`uuid`, Primary Key)
- **`project_id`** (`uuid`, Foreign Key to `projects`)
- **`amount`** (`numeric(12,2)`)
- **`category`** (`text`) - High-level category (e.g., 'Material', 'Labor').
- **`sub_category`** (`text`) - Specific item (e.g., 'Cement', 'Mason').
- **`vendor_name`** (`text`) - Sourced from or matched with the `vendors` table.
- **`payment_mode`** (`text`)
- **`date`** (`date`)
- **`remarks`** (`text`)
- **`quantity`** (`text`) - E.g., '50 bags'.
- **`receipt_url`** (`text`) - Path to invoice image in Supabase Storage.

### `vendors`
Global directory of vendors/suppliers/subcontractors per user.
- **`id`** (`uuid`, Primary Key)
- **`user_id`** (`uuid`, Foreign Key to `auth.users`)
- **`name`** (`text`)
- **`phone`** (`text`)
- **`category`** (`text`)
- **`address`** (`text`)
- **`gst_number`** (`text`)

### `categories`
Custom user-defined expense sub-categories.
- **`id`** (`uuid`, Primary Key)
- **`user_id`** (`uuid`, Foreign Key to `auth.users`)
- **`name`** (`text`) - Name of the category (e.g., 'Plumbing Material').
- **`type`** (`text`) - Links to main category ('Material', 'Labor', etc.).

## Supabase Storage Buckets
1. **`project-files`**: Used to store blueprints, plans, and daily site photos linked to a project.
2. **`receipts`** (Implied/Planned): Used to store images of invoices/bills linked to expenses.

## Security (Row Level Security)
- Every table enforces RLS. 
- Access policies strictly check `user_id = auth.uid()` for global tables (`projects`, `vendors`, `categories`) or join through `projects.user_id = auth.uid()` for relational tables (`income`, `expenses`).
