/**
 * Centralized API helper for the HealthConnect frontend.
 * Automatically injects the Bearer token from localStorage.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

export const authApi = {
  signup: (name: string, email: string, password: string, role: "patient" | "admin" = "patient") =>
    request("/auth/signup", { method: "POST", body: { name, email, password, role } }),

  login: (email: string, password: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      user: { id: string; email: string; name: string; role: "patient" | "admin" };
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

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminAppointment = Appointment & {
  profiles?: { name: string; role: string };
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
};
