-- ============================================================
-- HealthConnect — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── profiles table ───────────────────────────────────────
-- Extends Supabase's built-in auth.users table.
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT        NOT NULL DEFAULT '',
  role      TEXT        NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can only read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Auto-create profile on signup ───────────────────────
-- This trigger automatically creates a profile row
-- when a new user signs up via Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(
      CASE WHEN NEW.raw_user_meta_data->>'role' IN ('patient', 'admin')
           THEN NEW.raw_user_meta_data->>'role'
           ELSE 'patient'
      END,
      'patient'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── appointments table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  short_id     TEXT        NOT NULL DEFAULT '',
  patient_name TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  date         DATE        NOT NULL,
  time         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Confirmed', 'Pending', 'Cancelled', 'Rescheduled')),
  note         TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
-- Patients can only read/write their own appointments
CREATE POLICY "Patients can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can insert own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (admin backend) can access all appointments
CREATE POLICY "Service role can manage all appointments"
  ON public.appointments FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_user_id  ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status   ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date     ON public.appointments(date);

-- ─── How to create an admin user ─────────────────────────
-- After a user signs up normally, run this SQL to promote them:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<user-uuid>';
--
-- Or find the user's UUID in: Supabase Dashboard → Authentication → Users
-- ============================================================
