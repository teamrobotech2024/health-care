-- ============================================================
-- HealthConnect — Complete Database Schema & Migration Script
-- Run this script in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Enable UUID Extension ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 2. Roles Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Roles
INSERT INTO public.roles (id, name, description) VALUES
  ('patient', 'Patient', 'Can book, alter (reschedule), and cancel own appointments.'),
  ('doctor',  'Doctor',  'Can view bookings, alter schedules when unavailable, and manage patient appointments.'),
  ('admin',   'Admin',   'Full access: view registered doctors, manage hospital affiliations, add doctor accounts, and system stats.')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description;

-- ─── 3. Permissions Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permissions (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT ''
);

-- Seed Granular Permissions
INSERT INTO public.permissions (id, name, description) VALUES
  ('appointments:book',           'Book Appointments',           'Permission to book a new appointment'),
  ('appointments:reschedule_own', 'Reschedule Own Appointment',  'Permission to alter/reschedule own booked appointment'),
  ('appointments:cancel_own',     'Cancel Own Appointment',      'Permission to cancel own booked appointment'),
  ('appointments:read_all',       'View All Appointments',       'Permission to view all appointment records'),
  ('appointments:manage',         'Manage Appointments',         'Permission to alter status or reschedule any appointment'),
  ('doctors:read',                'View Doctors',                'Permission to view list of registered doctors and hospitals'),
  ('doctors:create',              'Add Doctor Accounts',         'Permission to register/add new doctor accounts'),
  ('doctors:manage',              'Manage Doctors',              'Permission to update or edit doctor profiles and hospital details'),
  ('admin:all',                   'Full Admin Privileges',       'Administrative privileges across the system')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description;

-- ─── 4. Role Permissions Mapping ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('patient', 'appointments:book'),
  ('patient', 'appointments:reschedule_own'),
  ('patient', 'appointments:cancel_own'),
  ('doctor', 'appointments:read_all'),
  ('doctor', 'appointments:manage'),
  ('doctor', 'doctors:read'),
  ('admin', 'appointments:book'),
  ('admin', 'appointments:reschedule_own'),
  ('admin', 'appointments:cancel_own'),
  ('admin', 'appointments:read_all'),
  ('admin', 'appointments:manage'),
  ('admin', 'doctors:read'),
  ('admin', 'doctors:create'),
  ('admin', 'doctors:manage'),
  ('admin', 'admin:all')
ON CONFLICT DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Allow public read access to permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to role_permissions" ON public.role_permissions FOR SELECT USING (true);

-- ─── 5. profiles table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT '',
  role       TEXT        NOT NULL DEFAULT 'patient' REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 6. Trigger: Auto-create profile on signup ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'patient'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 7. doctors table (Doctor Profiles) ──────────────────────
CREATE TABLE IF NOT EXISTS public.doctors (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  profession    TEXT        NOT NULL,
  hospital_name TEXT        NOT NULL,
  address       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to doctors"
  ON public.doctors FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage doctors"
  ON public.doctors FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 8. appointments table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id     UUID        REFERENCES public.doctors(id) ON DELETE SET NULL,
  doctor_name   TEXT        NOT NULL DEFAULT '',
  hospital_name TEXT        NOT NULL DEFAULT '',
  short_id      TEXT        NOT NULL DEFAULT '',
  patient_name  TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  date          DATE        NOT NULL,
  time          TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Confirmed', 'Pending', 'Cancelled', 'Rescheduled')),
  note          TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing appointments table if already created without doctor columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS hospital_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can insert own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all appointments"
  ON public.appointments FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 9. notifications table (Doctor Notifications) ───────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id      UUID        NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_id UUID        REFERENCES public.appointments(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  read           BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated doctors read notifications"
  ON public.notifications FOR SELECT
  USING (true);

-- ─── 10. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_user_id     ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id   ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date        ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id          ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital         ON public.doctors(hospital_name);
CREATE INDEX IF NOT EXISTS idx_notifications_doctor_id  ON public.notifications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON public.notifications(read);

-- ─── 11. otps table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otps (
  phone      TEXT        PRIMARY KEY,
  code       TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage otps"
  ON public.otps FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 12. Explicit Table Linking & Foreign Key Migration ──────
DO $$
BEGIN
  -- Link profiles.role to roles.id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_profiles_role') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_role FOREIGN KEY (role) REFERENCES public.roles(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- Link doctors.user_id to auth.users.id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_doctors_user') THEN
    ALTER TABLE public.doctors ADD CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Link appointments.user_id to auth.users.id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_appointments_user') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Link appointments.doctor_id to doctors.id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_appointments_doctor') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;
  END IF;

  -- Link notifications.doctor_id to doctors.id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_notifications_doctor') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_doctor FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;
  END IF;

  -- Link notifications.appointment_id to appointments.id
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_notifications_appointment') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_appointment FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 13. Reload PostgREST Schema Cache ────────────────────────
NOTIFY pgrst, 'reload schema';
-- ============================================================
