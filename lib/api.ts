/**
 * Centralized API helper for the HealthConnect frontend.
 * Automatically injects the Bearer token from localStorage.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T = unknown>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {}
): Promise<T> {
  // Get token from localStorage (falls back to passed token)
  const authToken =
    token ||
    (typeof window !== "undefined" ? localStorage.getItem("hc_access_token") : null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.message || "An unexpected error occurred.", res.status, data.error);
  }

  return data as T;
}

/** Custom error class with HTTP status code */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (name: string, email: string, password: string) =>
    request("/auth/signup", { method: "POST", body: { name, email, password } }),

  login: (email: string, password: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      user: { id: string; email: string; name: string; role: "patient" | "doctor" | "admin" };
    }>("/auth/login", { method: "POST", body: { email, password } }),

  logout: () =>
    request("/auth/logout", { method: "POST" }),

  me: () =>
    request<{ user: { id: string; email: string; name: string; role: string } }>(
      "/auth/me"
    ),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string; expiresAt: number }>(
      "/auth/refresh",
      { method: "POST", body: { refreshToken } }
    ),
};

// ─── Appointments ─────────────────────────────────────────────────────────────

export type Appointment = {
  id: string;
  short_id: string;
  user_id: string;
  doctor_id?: string;
  doctor_name?: string;
  hospital_name?: string;
  patient_name: string;
  phone: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Rescheduled";
  note: string;
  created_at: string;
};

export const appointmentsApi = {
  list: () =>
    request<{ appointments: Appointment[] }>("/appointments"),

  book: (data: {
    patient_name: string;
    phone: string;
    date: string;
    time: string;
    doctor_id?: string;
    doctor_name?: string;
    hospital_name?: string;
  }) =>
    request<{ message: string; appointment: Appointment }>("/appointments", {
      method: "POST",
      body: data,
    }),

  cancel: (id: string, reason: string) =>
    request<{ message: string; appointment: Appointment }>(
      `/appointments/${id}/cancel`,
      { method: "PATCH", body: { reason } }
    ),

  reschedule: (id: string, data?: { date?: string; time?: string }) =>
    request<{ message: string; appointment: Appointment }>(
      `/appointments/${id}/reschedule`,
      { method: "PATCH", body: data || {} }
    ),
};

// ─── Public Doctors ───────────────────────────────────────────────────────────

export const doctorsApi = {
  list: () =>
    request<{ doctors: Doctor[] }>("/doctors"),
};

// ─── Admin & Doctors ──────────────────────────────────────────────────────────

export type AdminAppointment = Appointment & {
  profiles?: { name: string; role: string };
};

export type Doctor = {
  id: string;
  user_id: string;
  name: string;
  profession: string;
  hospital_name: string;
  address: string;
  created_at: string;
};

export const adminApi = {
  getAppointments: (filters?: { status?: string; date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.date) params.set("date", filters.date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<{ appointments: AdminAppointment[] }>(
      `/admin/appointments${query}`
    );
  },

  updateStatus: (
    id: string,
    status: "Confirmed" | "Pending" | "Cancelled" | "Rescheduled",
    note?: string
  ) =>
    request<{ message: string; appointment: AdminAppointment }>(
      `/admin/appointments/${id}/status`,
      { method: "PATCH", body: { status, note } }
    ),

  getStats: () =>
    request<{
      stats: {
        total: number;
        confirmed: number;
        pending: number;
        cancelled: number;
        rescheduled: number;
      };
      weeklyData: { day: string; count: number }[];
    }>("/admin/stats"),

  getDoctors: () =>
    request<{ doctors: Doctor[] }>("/admin/doctors"),

  createDoctor: (data: {
    name: string;
    email: string;
    password: string;
    profession: string;
    hospital_name: string;
    address: string;
  }) =>
    request<{ message: string; doctor: Doctor }>("/admin/doctors", {
      method: "POST",
      body: data,
    }),
};

// ─── OTP Email / SMS ──────────────────────────────────────────────────────────

export const otpApi = {
  send: (email?: string, phone?: string) =>
    request<{ message: string; email?: string; success: boolean; provider: string }>("/otp/send", {
      method: "POST",
      body: { email, phone },
    }),

  verify: (otp: string, email?: string, phone?: string) =>
    request<{ message: string; verified: boolean }>("/otp/verify", {
      method: "POST",
      body: { otp, email, phone },
    }),
};

// ─── Doctor Portal ───────────────────────────────────────────────────────────

export type DoctorNotification = {
  id: string;
  doctor_id: string;
  appointment_id?: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export const doctorPortalApi = {
  getAppointments: () =>
    request<{ appointments: Appointment[]; doctor: Doctor }>("/doctor/appointments"),

  updateStatus: (
    id: string,
    data: { status?: "Confirmed" | "Pending" | "Cancelled" | "Rescheduled"; note?: string; date?: string; time?: string }
  ) =>
    request<{ message: string; appointment: Appointment }>(
      `/doctor/appointments/${id}/status`,
      { method: "PATCH", body: data }
    ),

  getNotifications: () =>
    request<{ notifications: DoctorNotification[] }>("/doctor/notifications"),

  markNotificationRead: (id?: string, readAll?: boolean) =>
    request<{ message: string }>("/doctor/notifications", {
      method: "PATCH",
      body: { id, readAll },
    }),
};

