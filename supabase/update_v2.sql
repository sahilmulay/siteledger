-- ============================================================
-- SiteLedger - Update V2: Payment Modes & Custom Categories
-- Run this in Supabase SQL Editor
-- ============================================================

-- Allow UPI apps (Google Pay, PhonePe, Paytm) and any custom payment mode
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_payment_mode_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_mode_check;

-- Allow custom user-typed expense categories
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
