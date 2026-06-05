-- Add date of birth (dob) to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob date;

-- Add bill photo URL (bill_url) to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS bill_url text;
