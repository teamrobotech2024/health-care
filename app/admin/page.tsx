"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type AdminAppointment, authApi } from "../../lib/api";
import { clearSession, getUser, getAvatarLetter } from "../../lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type AppStatus = AdminAppointment["status"];
type NavKey = "dashboard" | "appointments" | "patients" | "settings";

// ─── Icons ────────────────────────────────────────────────────────────────────
const DashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM13 7a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 01-2 2h-2a2 2 0 01-2-2V7zM3 16a2 2 0 012-2h3a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1zM13 16a2 2 0 012-2h2a2 2 0 012 2v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1z" />
  </svg>
);
const CalIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const PeopleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const navItems: { key: NavKey; label: string; Icon: React.FC }[] = [
  { key: "dashboard",    label: "Dashboard",    Icon: DashIcon },
  { key: "appointments", label: "Appointments", Icon: CalIcon },
  { key: "patients",     label: "Patients",     Icon: PeopleIcon },
  { key: "settings",     label: "Settings",     Icon: SettingsIcon },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AppStatus }) {
  const styles: Record<AppStatus, string> = {
    Confirmed:   "bg-emerald-50 text-emerald-600 border-emerald-100",
    Pending:     "bg-amber-50   text-amber-600   border-amber-100",
    Cancelled:   "bg-red-50     text-red-500     border-red-100",
    Rescheduled: "bg-blue-50    text-blue-600    border-blue-100",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Status Update Modal ──────────────────────────────────────────────────────
function StatusModal({ appt, onClose, onSave }: {
  appt: AdminAppointment;
  onClose: () => void;
  onSave: (id: string, status: AppStatus, note: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<AppStatus>(appt.status);
  const [note, setNote] = useState(appt.note || "");
  const [saving, setSaving] = useState(false);

  const statusOptions: AppStatus[] = ["Confirmed", "Pending", "Rescheduled", "Cancelled"];
  const activeColor: Record<AppStatus, string> = {
    Confirmed:   "bg-emerald-500 text-white border-emerald-500",
    Pending:     "bg-amber-500   text-white border-amber-500",
    Rescheduled: "bg-blue-500    text-white border-blue-500",
    Cancelled:   "bg-red-500     text-white border-red-500",
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(appt.id, status, note);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Update Appointment</h2>
            <p className="text-sm text-gray-500 mt-0.5">{appt.patient_name} · {appt.date} {appt.time}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {statusOptions.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`py-2 rounded-xl border text-sm font-semibold transition-all ${status === s ? activeColor[s] : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
            >{s}</button>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note to patient (optional)</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Your appointment is confirmed for 10 AM tomorrow."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none mb-5"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saving…</>) : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ appointments, weeklyData, loading }: {
  appointments: AdminAppointment[];
  weeklyData: { day: string; count: number }[];
  loading: boolean;
}) {
  const today      = new Date().toISOString().split("T")[0];
  const todayCount = appointments.filter((a) => a.date === today).length;
  const confirmed  = appointments.filter((a) => a.status === "Confirmed").length;
  const pending    = appointments.filter((a) => a.status === "Pending").length;
  const cancelled  = appointments.filter((a) => a.status === "Cancelled").length;
  const maxCount   = Math.max(...weeklyData.map((d) => d.count), 1);
  const recentAppts = [...appointments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Appointments" value={appointments.length} sub="All time" color="bg-indigo-50"
          icon={<svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard label="Today" value={todayCount} sub="Scheduled today" color="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Confirmed" value={confirmed} sub="Ready to go" color="bg-emerald-50"
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Pending" value={pending} sub="Needs attention" color="bg-amber-50"
          icon={<svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Chart + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Appointments This Week</h2>
              <p className="text-sm text-gray-400 mt-0.5">Daily breakdown</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
              {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          </div>
          {weeklyData.every((d) => d.count === 0) ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <p className="text-sm font-medium">No appointments this week yet</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-36">
              {weeklyData.map(({ day, count }) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-700">{count}</span>
                  <div className="w-full rounded-t-lg bg-indigo-500 hover:bg-indigo-400 transition-all cursor-pointer relative group"
                    style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? "4px" : "0" }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{count} appts</div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-bold text-gray-900 mb-4">Status Overview</h2>
          <div className="space-y-3">
            {([
              { label: "Confirmed",   count: confirmed, color: "bg-emerald-400" },
              { label: "Pending",     count: pending,   color: "bg-amber-400" },
              { label: "Cancelled",   count: cancelled, color: "bg-red-400" },
              { label: "Rescheduled", count: appointments.filter((a) => a.status === "Rescheduled").length, color: "bg-blue-400" },
            ]).map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 font-medium">{label}</span>
                  <span className="text-sm font-bold text-gray-800">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: appointments.length > 0 ? `${(count / appointments.length) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Recent Bookings</h2>
          <p className="text-sm text-gray-400 mt-0.5">Latest 5 requests</p>
        </div>
        {recentAppts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-10 h-10 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-sm font-medium">No appointments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentAppts.map((appt) => (
              <div key={appt.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(appt.patient_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{appt.patient_name}</p>
                    <p className="text-xs text-gray-400">{appt.date} · {appt.time}</p>
                  </div>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Appointments Page ────────────────────────────────────────────────────────
function AppointmentsPage({ appointments, loading, onStatusUpdate }: {
  appointments: AdminAppointment[];
  loading: boolean;
  onStatusUpdate: (id: string, status: AppStatus, note: string) => Promise<void>;
}) {
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState<AppStatus | "All">("All");
  const [filterDate, setFilterDate]   = useState("");
  const [selectedAppt, setSelectedAppt] = useState<AdminAppointment | null>(null);

  const filtered = useMemo(() => appointments.filter((a) => {
    const matchSearch = !search || a.patient_name.toLowerCase().includes(search.toLowerCase()) || (a.short_id || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || a.status === filterStatus;
    const matchDate   = !filterDate || a.date === filterDate;
    return matchSearch && matchStatus && matchDate;
  }), [appointments, search, filterStatus, filterDate]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">All Appointments</h1>
        <p className="text-sm text-gray-400 mt-0.5">{appointments.length} total records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search patient or ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AppStatus | "All")}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Rescheduled">Rescheduled</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
        {(filterDate || filterStatus !== "All" || search) && (
          <button onClick={() => { setSearch(""); setFilterStatus("All"); setFilterDate(""); }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition whitespace-nowrap">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-7 h-7 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-10 h-10 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-sm font-medium">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Req ID", "Patient", "Phone", "Date", "Time", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{appt.short_id || appt.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(appt.patient_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{appt.patient_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{appt.phone}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{appt.date}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{appt.time}</td>
                    <td className="px-5 py-4"><StatusBadge status={appt.status} /></td>
                    <td className="px-5 py-4">
                      <button onClick={() => setSelectedAppt(appt)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition">Update</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAppt && (
        <StatusModal appt={selectedAppt} onClose={() => setSelectedAppt(null)} onSave={onStatusUpdate} />
      )}
    </div>
  );
}

// ─── Patients Page ────────────────────────────────────────────────────────────
function PatientsPage({ appointments, loading }: {
  appointments: AdminAppointment[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const patients = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; lastDate: string }>();
    appointments.forEach((a) => {
      if (!map.has(a.user_id)) map.set(a.user_id, { name: a.patient_name, phone: a.phone, count: 0, lastDate: a.date });
      const p = map.get(a.user_id)!;
      p.count++;
      if (a.date > p.lastDate) p.lastDate = a.date;
    });
    return Array.from(map.values()).filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
    );
  }, [appointments, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Patients</h1>
        <p className="text-sm text-gray-400 mt-0.5">{patients.length} unique patients</p>
      </div>
      <div className="relative max-w-sm">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="w-7 h-7 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="w-10 h-10 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-sm font-medium">{search ? "No patients match your search" : "No patients yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{p.count}</p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs font-bold text-gray-900">{p.lastDate}</p>
                  <p className="text-xs text-gray-500">Last visit</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ adminName, adminEmail, adminAvatar, onLogout }: {
  adminName: string; adminEmail: string; adminAvatar: string; onLogout: () => void;
}) {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your admin account details</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
            {adminAvatar}
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{adminName}</p>
            <p className="text-sm text-gray-500">{adminEmail}</p>
            <span className="inline-block mt-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Admin</span>
          </div>
        </div>
        <div className="space-y-3">
          {[{ label: "Name", value: adminName }, { label: "Email", value: adminEmail }].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 cursor-not-allowed">{value}</div>
            </div>
          ))}
          <p className="text-xs text-gray-400">Profile details are managed through Supabase Auth.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Logging out will end your admin session.</p>
        <button onClick={onLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeNav, setActiveNav]   = useState<NavKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number }[]>([
    { day: "Mon", count: 0 }, { day: "Tue", count: 0 }, { day: "Wed", count: 0 },
    { day: "Thu", count: 0 }, { day: "Fri", count: 0 }, { day: "Sat", count: 0 }, { day: "Sun", count: 0 },
  ]);
  const [loading, setLoading]       = useState(true);
  const [adminName]   = useState(() => getUser()?.name || "Admin");
  const [adminEmail] = useState(() => getUser()?.email || "");
  const [adminAvatar] = useState(() => getAvatarLetter() || "A");

  useEffect(() => {
    Promise.all([adminApi.getAppointments(), adminApi.getStats()])
      .then(([apptsData, statsData]) => { setAppointments(apptsData.appointments); setWeeklyData(statsData.weeklyData); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearSession();
    router.push("/");
  };

  const handleStatusUpdate = async (id: string, status: AppStatus, note: string) => {
    await adminApi.updateStatus(id, status, note);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status, note } : a));
  };

  const pageTitles: Record<NavKey, string> = {
    dashboard: "Dashboard", appointments: "Appointments", patients: "Patients", settings: "Settings",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 bg-gray-900 flex flex-col z-50 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </div>
            <span className="text-lg font-bold text-white">HealthConnect</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-12">Admin Portal</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => { setActiveNav(key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav === key ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
              <Icon />{label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition cursor-default">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{adminAvatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{adminName}</p>
              <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition" onClick={() => setSidebarOpen(true)}>
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">{pageTitles[activeNav]}</h1>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">{adminAvatar}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {activeNav === "dashboard"    && <DashboardPage appointments={appointments} weeklyData={weeklyData} loading={loading} />}
          {activeNav === "appointments" && <AppointmentsPage appointments={appointments} loading={loading} onStatusUpdate={handleStatusUpdate} />}
          {activeNav === "patients"     && <PatientsPage appointments={appointments} loading={loading} />}
          {activeNav === "settings"     && <SettingsPage adminName={adminName} adminEmail={adminEmail} adminAvatar={adminAvatar} onLogout={handleLogout} />}
        </main>
      </div>
    </div>
  );
}
