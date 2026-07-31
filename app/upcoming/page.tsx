"use client";

import Image from "next/image";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Icons ───────────────────────────────────────────────────────────────────
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

const navItems = [
  { key: "home",     label: "Home",     Icon: HomeIcon },
  { key: "book",     label: "Book",     Icon: BookIcon },
  { key: "upcoming", label: "Upcoming", Icon: ListIcon },
  { key: "more",     label: "More",     Icon: MoreIcon },
];
const sidebarNavItems = [
  { key: "home",     label: "Home",             Icon: HomeIcon },
  { key: "book",     label: "Book Appointment", Icon: BookIcon },
  { key: "upcoming", label: "Upcoming",         Icon: ListIcon },
  { key: "more",     label: "More",             Icon: MoreIcon },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type AppStatus = "Confirmed" | "Pending" | "Cancelled" | "Rescheduled";
interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  doctor: string;
  department: string;
  status: AppStatus;
  note: string;
}

// ─── Appointments data (will be replaced by DB fetch) ────────────────────────
const ALL_APPOINTMENTS: Appointment[] = [];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AppStatus, { badge: string; note: string; dot: string }> = {
  Confirmed:   { badge: "bg-emerald-50 text-emerald-600 border-emerald-100", note: "bg-emerald-50 border-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Pending:     { badge: "bg-amber-50 text-amber-600 border-amber-100",       note: "bg-amber-50 border-amber-100 text-amber-700",       dot: "bg-amber-400"  },
  Rescheduled: { badge: "bg-blue-50 text-blue-600 border-blue-100",          note: "bg-blue-50 border-blue-100 text-blue-700",          dot: "bg-blue-500"   },
  Cancelled:   { badge: "bg-red-50 text-red-500 border-red-100",             note: "bg-red-50 border-red-100 text-red-600",             dot: "bg-red-400"    },
};

// ─── Cancel Reason Modal ──────────────────────────────────────────────────────
const CANCEL_REASONS = [
  "Slot Conflict",
  "No longer needed",
  "Found an alternative",
  "Personal Emergency",
  "Feeling Better",
  "Others",
];

function CancelModal({ id, onConfirm, onClose }:
  { id: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-900">Cancel Request</h2>
          <div className="w-8" /> {/* spacer */}
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Reason card */}
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-4 mb-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Why are you cancelling?</p>

            <div className="space-y-2.5">
              {CANCEL_REASONS.map((reason) => {
                const isSelected = selected === reason;
                return (
                  <button
                    key={reason}
                    onClick={() => setSelected(reason)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-sm font-medium text-left transition-all
                      ${isSelected
                        ? "border-gray-900 bg-gray-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    <span>{reason}</span>
                    {/* Radio circle */}
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isSelected ? "border-gray-900" : "border-gray-300"}`}>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className={`w-full py-4 rounded-2xl text-sm font-bold transition-all
              ${selected
                ? "bg-red-500 hover:bg-red-600 active:scale-[0.99] text-white shadow-md"
                : "bg-red-200 text-white cursor-not-allowed"
              }`}
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reschedule modal ─────────────────────────────────────────────────────────
function RescheduleModal({ id, onConfirm, onClose }:
  { id: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Reschedule {id}?</h2>
        <p className="text-sm text-gray-500 mb-6">You'll be redirected to pick a new date and time slot for this appointment.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Go back</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition">Reschedule</button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
function AppCard({
  appt, onCancel, onReschedule,
}: { appt: Appointment; onCancel: () => void; onReschedule: () => void }) {
  const cfg = STATUS_CONFIG[appt.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-bold text-gray-400">{appt.id}</p>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
          {appt.status}
        </span>
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-3">{appt.title}</h3>

      {/* Date & Time */}
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          {appt.date}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {appt.time}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          {appt.doctor} · <span className="text-gray-400">{appt.department}</span>
        </div>
      </div>

      {/* Status note */}
      <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4 border text-xs font-medium ${cfg.note}`}>
        <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${cfg.dot}`}/>
        {appt.note}
      </div>

      {/* Action buttons */}
      {appt.status !== "Cancelled" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={onReschedule}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Reschedule
            </button>
            <button onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Cancel
            </button>
          </div>
          {appt.status === "Confirmed" && (
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              View Reminder
            </button>
          )}
        </div>
      )}
      {appt.status === "Cancelled" && (
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-sm font-semibold text-white transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Book Again
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UpcomingPage() {
  const router = useRouter();
  const [activeNav, setActiveNav]   = useState("upcoming");
  const [activeTab, setActiveTab]   = useState<"Bookings"|"Rescheduled"|"Cancelled">("Bookings");
  const [cancelId, setCancelId]     = useState<string|null>(null);
  const [rescheduleId, setRescheduleId] = useState<string|null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(ALL_APPOINTMENTS);

  const tabFilter: Record<string, AppStatus[]> = {
    Bookings:    ["Confirmed","Pending"],
    Rescheduled: ["Rescheduled"],
    Cancelled:   ["Cancelled"],
  };
  const filtered = appointments.filter(a => tabFilter[activeTab].includes(a.status));

  const doCancel = (id: string, reason: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelled" as AppStatus, note: `Cancelled: ${reason}. Book a new one if needed.` } : a));
    setCancelId(null);
  };
  const doReschedule = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "Rescheduled" as AppStatus, note: "Your appointment has been rescheduled. New date confirmed." } : a));
    setRescheduleId(null);
  };

  const tabs: ("Bookings"|"Rescheduled"|"Cancelled")[] = ["Bookings","Rescheduled","Cancelled"];

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex font-sans">

      {/* ── Desktop Sidebar ────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm min-h-screen sticky top-0 flex-shrink-0">
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">HealthConnect</span>
          </div>
        </div>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">A</div>
            <div><p className="text-sm font-semibold text-gray-900">Arnav</p><p className="text-xs text-gray-500">Patient</p></div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarNavItems.map(({key,label,Icon})=>(
            <button key={key}
              onClick={()=>{ setActiveNav(key); if(key==="home") router.push("/patient"); if(key==="book") router.push("/book"); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav===key?"bg-indigo-50 text-indigo-600":"text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
              <Icon active={activeNav===key}/>{label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <button onClick={()=>router.push("/")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Appointments</h1>
            <p className="text-xs text-gray-400">{appointments.length} total · {appointments.filter(a=>a.status==="Confirmed").length} confirmed</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>router.push("/book")} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              New Booking
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">

          {/* ═══════════ MOBILE ═══════════ */}
          <div className="md:hidden bg-white min-h-screen">
            {/* Mobile header */}
            <div className="flex items-center justify-between px-4 pt-5 pb-3">
              <button onClick={()=>router.push("/patient")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h1 className="text-base font-bold text-gray-900">My Appointments</h1>
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
              {tabs.map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all
                    ${activeTab===tab?"bg-gray-900 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {tab}
                  {tab==="Bookings" && appointments.filter(a=>tabFilter.Bookings.includes(a.status)).length > 0 && (
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab===tab?"bg-white text-gray-900":"bg-gray-300 text-gray-600"}`}>
                      {appointments.filter(a=>tabFilter.Bookings.includes(a.status)).length}
                    </span>
                  )}
                </button>
              ))}
              <button className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-auto transition">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
              </button>
            </div>

            {/* Cards */}
            <div className="px-4 pb-6 space-y-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {activeTab === "Rescheduled" ? (
                    <>
                      <div className="mb-4">
                        <Image src="/No rescheduled.jpg" alt="No rescheduled appointments" width={180} height={180} className="object-contain rounded-2xl" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500">No rescheduled appointments</p>
                      <p className="text-xs text-gray-400 mt-1">Rescheduled bookings will appear here</p>
                    </>
                  ) : activeTab === "Cancelled" ? (
                    <>
                      <div className="mb-4">
                        <Image src="/no-list-symbol.png" alt="No cancelled appointments" width={140} height={140} className="object-contain" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500">No cancelled appointments</p>
                      <p className="text-xs text-gray-400 mt-1">Cancelled bookings will appear here</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-500">No bookings yet</p>
                      <p className="text-xs text-gray-400 mt-1">Your appointments will appear here</p>
                      <button onClick={()=>router.push("/book")} className="mt-4 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl transition hover:bg-gray-800">
                        Book Now
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filtered.map(appt=>(
                  <AppCard key={appt.id} appt={appt}
                    onCancel={()=>setCancelId(appt.id)}
                    onReschedule={()=>setRescheduleId(appt.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ═══════════ DESKTOP ═══════════ */}
          <div className="hidden md:block p-8">
            {/* Tab bar */}
            <div className="flex items-center gap-2 mb-6">
              {tabs.map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${activeTab===tab?"bg-gray-900 text-white shadow-md":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {tab}
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab===tab?"bg-white text-gray-900":"bg-gray-100 text-gray-500"}`}>
                    {appointments.filter(a=>tabFilter[tab].includes(a.status)).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Grid of cards */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
                {activeTab === "Rescheduled" ? (
                  <>
                    <Image src="/No rescheduled.jpg" alt="No rescheduled appointments" width={200} height={200} className="object-contain rounded-2xl mb-4" />
                    <p className="text-sm font-semibold text-gray-500">No rescheduled appointments</p>
                    <p className="text-xs text-gray-400 mt-1">Rescheduled bookings will appear here</p>
                  </>
                ) : activeTab === "Cancelled" ? (
                  <>
                    <Image src="/no-list-symbol.png" alt="No cancelled appointments" width={160} height={160} className="object-contain mb-4" />
                    <p className="text-sm font-semibold text-gray-500">No cancelled appointments</p>
                    <p className="text-xs text-gray-400 mt-1">Cancelled bookings will appear here</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-500">No bookings yet</p>
                    <button onClick={()=>router.push("/book")} className="mt-4 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition">
                      Book Now
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(appt=>(
                  <AppCard key={appt.id} appt={appt}
                    onCancel={()=>setCancelId(appt.id)}
                    onReschedule={()=>setRescheduleId(appt.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-40">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map(({key,label,Icon})=>(
              <button key={key}
                onClick={()=>{ setActiveNav(key); if(key==="home") router.push("/patient"); if(key==="book") router.push("/book"); }}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all">
                <Icon active={activeNav===key}/>
                <span className={`text-[10px] font-semibold ${activeNav===key?"text-indigo-600":"text-gray-400"}`}>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Cancel Modal */}
      {cancelId && (
        <CancelModal id={cancelId} onClose={()=>setCancelId(null)} onConfirm={(reason)=>doCancel(cancelId, reason)}/>
      )}

      {/* Reschedule Modal */}
      {rescheduleId && (
        <RescheduleModal id={rescheduleId} onClose={()=>setRescheduleId(null)} onConfirm={()=>doReschedule(rescheduleId)}/>
      )}
    </div>
  );
}
