-- ============================================================
-- SiteLedger - Complete Database Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_code    text NOT NULL,
  project_name    text NOT NULL,
  owner_name      text NOT NULL,
  owner_mobile    text,
  site_address    text,
  project_status  text NOT NULL DEFAULT 'Active'
                  CHECK (project_status IN ('Active', 'Completed', 'On Hold')),
  share_token     uuid UNIQUE DEFAULT uuid_generate_v4(),
  notes           text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS projects_user_code_idx ON projects(user_id, project_code);

-- ============================================================
-- TABLE: income
-- ============================================================
CREATE TABLE IF NOT EXISTS income (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_mode          text NOT NULL,
  transaction_reference text,
  date                  date NOT NULL DEFAULT CURRENT_DATE,
  remarks               text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS income_project_id_idx ON income(project_id);
CREATE INDEX IF NOT EXISTS income_date_idx ON income(date DESC);

-- ============================================================
-- TABLE: expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category              text NOT NULL,
  sub_category          text,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_mode          text NOT NULL,
  transaction_reference text,
  vendor_name           text,
  vendor_mobile         text,
  expense_date          date NOT NULL DEFAULT CURRENT_DATE,
  remarks               text,
  bill_image_url        text,
  bill_number           text,
  bill_date             date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_project_id_idx ON expenses(project_id);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses(expense_date DESC);

-- ============================================================
-- FUTURE MODULE TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_attendance (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_name text NOT NULL,
  role        text,
  date        date NOT NULL,
  status      text CHECK (status IN ('Present','Absent','Half Day')),
  wages       numeric(10,2),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_inventory (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material     text NOT NULL,
  unit         text,
  quantity     numeric(10,3),
  rate         numeric(10,2),
  received_at  date,
  vendor_name  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_diary (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  diary_date  date NOT NULL DEFAULT CURRENT_DATE,
  weather     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS: auto updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS income_updated_at ON income;
CREATE TRIGGER income_updated_at
  BEFORE UPDATE ON income
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECURITY DEFINER FUNCTIONS for public Owner Portal
-- ============================================================
CREATE OR REPLACE FUNCTION get_project_by_share_token(p_token uuid)
RETURNS TABLE (
  id uuid, project_code text, project_name text, owner_name text,
  site_address text, project_status text, created_at timestamptz
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.project_code, p.project_name, p.owner_name,
    p.site_address, p.project_status, p.created_at
  FROM projects p WHERE p.share_token = p_token;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_income_by_share_token(p_token uuid)
RETURNS TABLE (
  id uuid, amount numeric, payment_mode text, date date,
  remarks text, created_at timestamptz
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.amount, i.payment_mode, i.date, i.remarks, i.created_at
  FROM income i
  JOIN projects p ON p.id = i.project_id
  WHERE p.share_token = p_token
  ORDER BY i.date DESC LIMIT 50;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_expenses_by_share_token(p_token uuid)
RETURNS TABLE (
  id uuid, category text, sub_category text, amount numeric,
  payment_mode text, vendor_name text, expense_date date,
  remarks text, created_at timestamptz
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.category, e.sub_category, e.amount,
    e.payment_mode, e.vendor_name, e.expense_date, e.remarks, e.created_at
  FROM expenses e
  JOIN projects p ON p.id = e.project_id
  WHERE p.share_token = p_token
  ORDER BY e.expense_date DESC LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_diary ENABLE ROW LEVEL SECURITY;

-- projects
DROP POLICY IF EXISTS "Users manage own projects" ON projects;
CREATE POLICY "Users manage own projects" ON projects FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- income
DROP POLICY IF EXISTS "Users manage own income" ON income;
CREATE POLICY "Users manage own income" ON income FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Users manage own expenses" ON expenses;
CREATE POLICY "Users manage own expenses" ON expenses FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- future modules
DROP POLICY IF EXISTS "Users manage worker attendance" ON worker_attendance;
CREATE POLICY "Users manage worker attendance" ON worker_attendance FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage material inventory" ON material_inventory;
CREATE POLICY "Users manage material inventory" ON material_inventory FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage site diary" ON site_diary;
CREATE POLICY "Users manage site diary" ON site_diary FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
