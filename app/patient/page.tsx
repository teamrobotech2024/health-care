"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi, appointmentsApi, type Appointment } from "../../lib/api";
import { getUser, clearSession, getAvatarLetter } from "../../lib/auth";

// ─── Icons ──────────────────────────────────────────────────────────────────
function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-indigo-600" : "text-gray-400"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function BookIcon({ active }: { active?: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-indigo-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function ListIcon({ active }: { active?: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-indigo-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function MoreIcon({ active }: { active?: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-indigo-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const navItems = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "book", label: "Book", Icon: BookIcon },
  { key: "upcoming", label: "Upcoming", Icon: ListIcon },
  { key: "more", label: "More", Icon: MoreIcon },
];

const sidebarNavItems = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "book", label: "Book Appointment", Icon: BookIcon },
  { key: "upcoming", label: "Upcoming", Icon: ListIcon },
  { key: "more", label: "More", Icon: MoreIcon },
];

export default function PatientHome() {
  const [activeNav, setActiveNav] = useState("home");
  const router = useRouter();

  const [userName] = useState(() => {
    const stored = getUser();
    return stored?.name || stored?.email || "Patient";
  });
  const [avatarLetter] = useState(() => getAvatarLetter() || "P");
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // ─── Load appointments ───────────────────────────────────────────────
  useEffect(() => {
    // Fetch upcoming confirmed/pending appointments
    appointmentsApi
      .list()
      .then(({ appointments }) => {
        const upcoming = appointments.filter(
          (a) => a.status === "Confirmed" || a.status === "Pending"
        );
        setUpcomingAppointments(upcoming);
      })
      .catch(() => {})
      .finally(() => setLoadingAppts(false));
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    } finally {
      clearSession();
      router.push("/");
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* ── Desktop Sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm min-h-screen sticky top-0">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">HealthConnect</span>
          </div>
        </div>

        {/* Patient Info */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              {avatarLetter}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">Patient</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarNavItems.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveNav(key); if (key === "book") router.push("/book"); if (key === "upcoming") router.push("/upcoming"); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeNav === key ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon active={activeNav === key} />
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 max-w-lg mx-auto w-full px-4 md:px-8 pt-6 md:max-w-none md:mx-0">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Hello 🌟,</p>
              <p className="text-xl font-bold text-gray-900">{userName}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition">
                <BellIcon />
                {upcomingAppointments.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {avatarLetter}
              </div>
            </div>
          </div>

          {/* Hero */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
            How can we<br />help you today?
          </h1>

          {/* Book Appointment CTA */}
          <button onClick={() => router.push("/book")} className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white rounded-2xl p-5 flex items-center gap-4 mb-6 transition-all shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-base">Book Appointment &rarr;</p>
              <p className="text-sm text-gray-400 mt-0.5">Schedule your next visit</p>
            </div>
          </button>

          {/* Upcoming section */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">Upcoming</h2>
              {upcomingAppointments.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                  {upcomingAppointments.length}
                </span>
              )}
            </div>
            <button onClick={() => router.push("/upcoming")} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition">
              View all
            </button>
          </div>

          {/* Appointments list */}
          {loadingAppts ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-500 font-medium">No upcoming appointments</p>
              <p className="text-xs text-gray-400 mt-1">Book your first appointment above</p>
            </div>
          ) : (
            upcomingAppointments.slice(0, 2).map((appt) => (
              <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1">{appt.short_id}</p>
                    <p className="text-base font-bold text-gray-900">Appointment Request</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    appt.status === "Confirmed"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}>
                    {appt.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <CalendarIcon />
                    <span>{formatDate(appt.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <ClockIcon />
                    <span>{appt.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Note */}
          <div className="text-center mb-4 mt-2">
            <p className="text-sm text-gray-400 font-medium">Note:</p>
            <p className="text-sm text-gray-500 mt-1">Your request will be reviewed and<br />you will receive a confirmation.</p>
          </div>

          {/* View Appointments CTA */}
          <button onClick={() => router.push("/upcoming")} className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white rounded-2xl text-sm font-semibold transition-all shadow-md">
            View Appointments
          </button>
        </main>

        {/* ── Mobile Bottom Nav ──────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-50">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveNav(key); if (key === "book") router.push("/book"); if (key === "upcoming") router.push("/upcoming"); }}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all"
              >
                <Icon active={activeNav === key} />
                <span className={`text-[10px] font-semibold ${activeNav === key ? "text-indigo-600" : "text-gray-400"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
