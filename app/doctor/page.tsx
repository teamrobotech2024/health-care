"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doctorPortalApi, type Appointment, type Doctor, type DoctorNotification, authApi } from "../../lib/api";
import { clearSession, getUser, getAvatarLetter } from "../../lib/auth";

type NavKey = "appointments" | "notifications" | "profile";
type AppStatus = Appointment["status"];

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

// ─── Reschedule / Alter Modal for Doctor ──────────────────────────────────────
function DoctorAlterModal({ appt, onClose, onSave }: {
  appt: Appointment;
  onClose: () => void;
  onSave: (id: string, updates: { status: AppStatus; note: string; date: string; time: string }) => Promise<void>;
}) {
  const [status, setStatus] = useState<AppStatus>(appt.status);
  const [note, setNote]     = useState(appt.note || "");
  const [date, setDate]     = useState(appt.date || "");
  const [time, setTime]     = useState(appt.time || "");
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
    await onSave(appt.id, { status, note, date, time });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Manage / Alter Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">{appt.patient_name} ({appt.phone})</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Update Status</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {statusOptions.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`py-2 rounded-xl border text-xs font-semibold transition-all ${status === s ? activeColor[s] : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
            >{s}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Alter Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Alter Time</label>
            <input type="text" placeholder="e.g. 11:00 AM" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctor Note to Patient</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Rescheduled due to emergency surgery. Please confirm new time slot."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none mb-5"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saving…</>) : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Doctor Dashboard Component ──────────────────────────────────────────
export default function DoctorDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<NavKey>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorInfo, setDoctorInfo]     = useState<Doctor | null>(null);
  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  const [loading, setLoading]           = useState(true);

  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [search, setSearch]             = useState("");

  const doctorName   = useState(() => getUser()?.name || "Doctor")[0];
  const doctorAvatar = useState(() => getAvatarLetter() || "D")[0];

  useEffect(() => {
    Promise.all([doctorPortalApi.getAppointments(), doctorPortalApi.getNotifications()])
      .then(([apptsRes, notifsRes]) => {
        setAppointments(apptsRes.appointments || []);
        setDoctorInfo(apptsRes.doctor || null);
        setNotifications(notifsRes.notifications || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearSession();
    router.push("/");
  };

  const handleUpdateStatus = async (id: string, updates: { status: AppStatus; note: string; date: string; time: string }) => {
    await doctorPortalApi.updateStatus(id, updates);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
  };

  const markRead = async (id?: string, readAll?: boolean) => {
    await doctorPortalApi.markNotificationRead(id, readAll);
    if (readAll) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } else if (id) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredAppts = useMemo(() => {
    return appointments.filter((a) =>
      !search || a.patient_name.toLowerCase().includes(search.toLowerCase()) || a.phone.includes(search)
    );
  }, [appointments, search]);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col min-h-screen sticky top-0 flex-shrink-0">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">HealthConnect</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-12">Doctor Portal</p>
        </div>

        {doctorInfo && (
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{doctorInfo.profession}</p>
            <p className="text-sm font-semibold text-white truncate">{doctorInfo.hospital_name}</p>
            <p className="text-[11px] text-gray-400 truncate">{doctorInfo.address}</p>
          </div>
        )}

        <nav className="flex-1 px-3 py-5 space-y-1">
          <button onClick={() => setActiveNav("appointments")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav === "appointments" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Appointments ({appointments.length})
          </button>

          <button onClick={() => setActiveNav("notifications")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav === "notifications" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{unreadCount}</span>
            )}
          </button>

          <button onClick={() => setActiveNav("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav === "profile" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            My Profile
          </button>
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">{doctorAvatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{doctorName}</p>
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Doctor</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {activeNav === "appointments" && "Assigned Appointments"}
              {activeNav === "notifications" && "Patient Booking Notifications"}
              {activeNav === "profile" && "Doctor Profile"}
            </h1>
            <p className="text-xs text-gray-400">Welcome, {doctorName}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => markRead(undefined, true)} className="text-xs font-semibold text-indigo-600 hover:underline">
              Mark all as read
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* APPOINTMENTS VIEW */}
          {activeNav === "appointments" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="relative max-w-sm flex-1">
                  <input type="text" placeholder="Search patient name or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <svg className="w-7 h-7 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  </div>
                ) : filteredAppts.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm font-medium">
                    No appointments booked for you yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                          <th className="px-5 py-3">Patient</th>
                          <th className="px-5 py-3">Phone</th>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Time</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {filteredAppts.map((appt) => (
                          <tr key={appt.id} className="hover:bg-gray-50">
                            <td className="px-5 py-4 font-bold text-gray-900">{appt.patient_name}</td>
                            <td className="px-5 py-4 text-gray-600">{appt.phone}</td>
                            <td className="px-5 py-4 text-gray-700 font-semibold">{appt.date}</td>
                            <td className="px-5 py-4 text-gray-700 font-semibold">{appt.time}</td>
                            <td className="px-5 py-4"><StatusBadge status={appt.status} /></td>
                            <td className="px-5 py-4">
                              <button onClick={() => setSelectedAppt(appt)}
                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition">
                                Alter / Reschedule
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS VIEW */}
          {activeNav === "notifications" && (
            <div className="max-w-2xl space-y-3">
              {notifications.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-400 text-sm">
                  No notifications received yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-2xl border transition ${!n.read ? "bg-indigo-50/60 border-indigo-100" : "bg-white border-gray-100"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${!n.read ? "bg-indigo-600" : "bg-gray-300"}`} />
                        <h3 className="text-sm font-bold text-gray-900">{n.title}</h3>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-2 pl-4">{n.message}</p>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="mt-3 pl-4 text-xs font-semibold text-indigo-600 hover:underline">
                        Mark as read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* PROFILE VIEW */}
          {activeNav === "profile" && (
            <div className="max-w-lg space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4">Doctor Credentials</h2>
                {doctorInfo ? (
                  <div className="space-y-3 text-sm">
                    <div><span className="text-xs text-gray-400 block uppercase">Name</span><p className="font-bold text-gray-900">{doctorInfo.name}</p></div>
                    <div><span className="text-xs text-gray-400 block uppercase">Specialty / Profession</span><p className="font-bold text-indigo-600">{doctorInfo.profession}</p></div>
                    <div><span className="text-xs text-gray-400 block uppercase">Hospital Name</span><p className="font-bold text-gray-900">{doctorInfo.hospital_name}</p></div>
                    <div><span className="text-xs text-gray-400 block uppercase">Address</span><p className="text-gray-700">{doctorInfo.address}</p></div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Doctor details managed by System Admin.</p>
                )}
              </div>
            </div>
          )}
        </main>

        {selectedAppt && (
          <DoctorAlterModal
            appt={selectedAppt}
            onClose={() => setSelectedAppt(null)}
            onSave={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}
