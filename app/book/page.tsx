"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { appointmentsApi } from "../../lib/api";
import { getUser, getAvatarLetter } from "../../lib/auth";

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

const TIME_SLOTS = ["09:00 AM","10:00 AM","11:00 AM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","07:00 PM","08:00 PM"];
const DAY_NAMES  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isPast(d: Date) { const t=new Date(); t.setHours(0,0,0,0); return d<t; }

function buildStrip() {
  const today = new Date(); today.setHours(0,0,0,0);
  return Array.from({length:14},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()+i); return {date:d,day:DAY_NAMES[d.getDay()],num:d.getDate()}; });
}

// ─── OTP Overlay ─────────────────────────────────────────────────────────────
function OtpOverlay({ phone, onVerified, onBack }:
  { phone: string; onVerified: () => void; onBack: () => void }) {
  const [digits, setDigits] = useState(["","","","","",""]);
  const [error, setError]   = useState("");
  const [timer, setTimer]   = useState(30);
  const [shaking, setShaking] = useState(false);
  const refs = useRef<(HTMLInputElement|null)[]>([]);

  // countdown
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t-1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const maskedPhone = "+91 " + phone.replace(/\d(?=\d{4})/g, "•");

  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[idx] = val;
    setDigits(next); setError("");
    if (val && idx < 5) refs.current[idx+1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits]; next[idx-1] = ""; setDigits(next);
      refs.current[idx-1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (text.length === 6) {
      setDigits(text.split(""));
      refs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const verify = () => {
    const otp = digits.join("");
    if (otp.length < 6) { setError("Enter all 6 digits"); return; }
    // Demo: accept 123456 or any 6-digit code
    if (otp === "000000") { setError("Invalid OTP. Try again."); setShaking(true); setTimeout(()=>setShaking(false),500); return; }
    onVerified();
  };

  const resend = () => { setTimer(30); setDigits(["","","","","",""]); setError(""); refs.current[0]?.focus(); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Verify Your Number</h2>
          <p className="text-sm text-gray-500 mt-1">
            We sent a 6-digit OTP to{" "}
            <span className="font-semibold text-gray-900">{maskedPhone}</span>
          </p>
        </div>

        <div className="px-6 pt-5 pb-6">
          {/* OTP Boxes */}
          <div
            className={`flex gap-2.5 justify-center mb-2 transition-all ${shaking ? "animate-[shake_0.4s_ease]" : ""}`}
            onPaste={handlePaste}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                onFocus={e => e.target.select()}
                className={`w-12 h-14 rounded-2xl border-2 text-center text-xl font-bold text-gray-900 focus:outline-none transition-all
                  ${d ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"}
                  ${error ? "border-red-400" : "focus:border-gray-900"}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}

          {/* Hint */}
          <p className="text-xs text-gray-400 text-center mb-5">
            {timer > 0
              ? <>Resend OTP in <span className="font-semibold text-gray-700">{timer}s</span></>
              : <button onClick={resend} className="font-semibold text-indigo-600 hover:underline">Resend OTP</button>
            }
          </p>

          {/* Demo hint */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-5">
            <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-xs text-amber-700">Demo: Enter any 6 digits (e.g. <b>123456</b>) to verify</p>
          </div>

          {/* Verify button */}
          <button
            onClick={verify}
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white text-sm font-bold rounded-2xl transition-all mb-3"
          >
            Verify & Confirm Booking
          </button>

          {/* Back */}
          <button onClick={onBack} className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition">
            ← Edit details
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%,60%{transform:translateX(-6px)}
          40%,80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

// ─── Booking Confirmed Modal ──────────────────────────────────────────────────
function ConfirmModal({ name, phone, date, time, onClose }:
  { name: string; phone: string; date: Date | null; time: string; onClose: () => void }) {
  const dateStr = date ? `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` : "";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-emerald-500 px-6 pt-8 pb-14 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Appointment Confirmed!</h2>
          <p className="text-emerald-100 text-sm mt-1">OTP verified. You're all set.</p>
        </div>
        <div className="-mt-8 mx-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-3.5">
          {[
            { label:"Patient", value:name, icon:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
            { label:"Phone",   value:"+91 "+phone, icon:"M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
            { label:"Date",    value:dateStr, icon:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { label:"Time",    value:time, icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map(({label,value,icon}) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-6 pt-4 space-y-2">
          <button onClick={onClose} className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-2xl transition">
            View My Appointments
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Calendar ─────────────────────────────────────────────────────────
function DesktopCalendar({ selected, onSelect }:
  { selected: Date | null; onSelect: (d: Date) => void }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  const prev = () => viewMonth===0 ? (setViewMonth(11),setViewYear(y=>y-1)) : setViewMonth(m=>m-1);
  const next = () => viewMonth===11 ? (setViewMonth(0),setViewYear(y=>y+1)) : setViewMonth(m=>m+1);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-sm font-bold text-gray-900">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={next} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d=><div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day,idx) => {
          if (!day) return <div key={`e-${idx}`}/>;
          const d=new Date(viewYear,viewMonth,day);
          const past=isPast(d), sel=selected?isSameDay(d,selected):false, todayDay=isSameDay(d,today);
          return (
            <button key={day} disabled={past} onClick={()=>onSelect(d)}
              className={`h-9 w-full rounded-xl text-sm font-semibold transition-all
                ${past?"text-gray-300 cursor-not-allowed":""}
                ${sel?"bg-gray-900 text-white shadow-md":""}
                ${todayDay&&!sel?"text-indigo-600 font-bold ring-1 ring-inset ring-indigo-300":""}
                ${!past&&!sel&&!todayDay?"text-gray-700 hover:bg-gray-100":""}`}
            >{day}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookAppointment() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("book");
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [selectedDate, setSelectedDate] = useState<Date|null>(null);
  const [selectedTime, setSelectedTime] = useState<string|null>(null);
  const [errors, setErrors]       = useState<Record<string,string>>({});
  const [step, setStep]           = useState<"form"|"otp"|"confirmed">("form");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const strip = useMemo(()=>buildStrip(),[]);

  // Pre-fill name from logged-in user
  useEffect(() => {
    const user = getUser();
    if (user?.name) setName(user.name);
  }, []);

  const handleContinue = () => {
    const e: Record<string,string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!phone.trim()) e.phone = "Phone is required";
    else if (!/^[0-9\s\-+()]{7,15}$/.test(phone.trim())) e.phone = "Enter a valid number";
    if (!selectedDate) e.date = "Please select a date";
    if (!selectedTime) e.time = "Please select a time";
    setErrors(e);
    if (!Object.keys(e).length) setStep("otp");
  };

  // Called after OTP is verified — POSTs appointment to backend
  const handleOtpVerified = async () => {
    setBookingLoading(true);
    setBookingError("");
    try {
      const dateStr = selectedDate!.toISOString().split("T")[0];
      await appointmentsApi.book({
        patient_name: name,
        phone,
        date: dateStr,
        time: selectedTime!,
      });
      setStep("confirmed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed. Please try again.";
      setBookingError(msg);
      setStep("form"); // go back to form to show error
    } finally {
      setBookingLoading(false);
    }
  };

  const isReady = name && phone && selectedDate && selectedTime;

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
          {sidebarNavItems.map(({key,label,Icon}) => (
            <button key={key}
              onClick={()=>{ setActiveNav(key); if(key==="home") router.push("/patient"); if(key==="upcoming") router.push("/upcoming"); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav===key?"bg-indigo-50 text-indigo-600":"text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
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

      {/* ── Content Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={()=>router.push("/patient")} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Book Appointment</h1>
              <p className="text-xs text-gray-400">Fill in details and choose a slot</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">A</div>
        </div>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">

          {/* ═══════════ MOBILE LAYOUT ═══════════ */}
          <div className="md:hidden flex flex-col min-h-screen bg-white">
            {/* Mobile header */}
            <div className="flex items-center justify-between px-4 pt-5 pb-3">
              <button onClick={()=>router.push("/patient")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h1 className="text-base font-bold text-gray-900">Book Appointment</h1>
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
              {/* Your Details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Your Details</h2>
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1.5">Name</label>
                  <input type="text" placeholder="Enter full name" value={name}
                    onChange={e=>{setName(e.target.value);setErrors(p=>({...p,name:""}));}}
                    className={`w-full px-4 py-3.5 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 transition ${errors.name?"border-red-300 focus:ring-red-100":"border-gray-200 focus:ring-gray-200 focus:border-gray-400"}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Phone</label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3.5 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-700 select-none flex-shrink-0">+91</div>
                    <input type="tel" placeholder="Enter your mobile number" value={phone}
                      onChange={e=>{setPhone(e.target.value);setErrors(p=>({...p,phone:""}));}}
                      className={`flex-1 px-4 py-3.5 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 transition ${errors.phone?"border-red-300 focus:ring-red-100":"border-gray-200 focus:ring-gray-200 focus:border-gray-400"}`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Select Slot */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <h2 className="text-xl font-bold text-gray-900">Select Slot</h2>
                </div>
                {/* Day strip */}
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                  {strip.map(({date,day,num})=>{
                    const sel=selectedDate?isSameDay(date,selectedDate):false;
                    return (
                      <button key={num+"-"+date.getMonth()}
                        onClick={()=>{setSelectedDate(date);setErrors(p=>({...p,date:""}));}}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-[52px] h-[66px] rounded-2xl transition-all
                          ${sel?"bg-gray-900 text-white shadow-lg":"bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${sel?"text-gray-300":"text-gray-500"}`}>{day}</span>
                        <span className="text-lg font-bold leading-none">{num}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.date && <p className="text-xs text-red-500 mt-2">{errors.date}</p>}
                {/* Time grid */}
                <div className="mt-4 bg-gray-50 border border-gray-100 rounded-3xl p-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    {TIME_SLOTS.map((slot)=>{
                      const sel=selectedTime===slot;
                      return (
                        <button key={slot}
                          onClick={()=>{setSelectedTime(slot);setErrors(p=>({...p,time:""}));}}
                          className={`py-3 rounded-2xl text-sm font-semibold transition-all text-center
                            ${sel?"bg-gray-900 text-white shadow-md":"bg-white text-gray-700 border border-gray-200 hover:border-gray-400"}`}
                        >{slot}</button>
                      );
                    })}
                  </div>
                  {errors.time && <p className="text-xs text-red-500 mt-3">{errors.time}</p>}
                </div>
              </div>
            </div>

            {/* Continue button */}
            <div className="px-4 py-4 bg-white border-t border-gray-100">
              <button onClick={handleContinue}
                className="w-full py-4 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white text-sm font-bold rounded-2xl transition-all shadow-md">
                Continue
              </button>
            </div>
          </div>

          {/* ═══════════ DESKTOP LAYOUT ═══════════ */}
          <div className="hidden md:block p-8">
            <div className="grid grid-cols-3 gap-6">

              {/* COL 1: Patient Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </span>Patient Details
                </h2>
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name</label>
                  <input type="text" placeholder="e.g. Arnav Shah" value={name}
                    onChange={e=>{setName(e.target.value);setErrors(p=>({...p,name:""}));}}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition ${errors.name?"border-red-300 focus:ring-red-100":"border-gray-200 focus:ring-indigo-200 focus:border-indigo-400"}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-600 select-none">+91</div>
                    <input type="tel" placeholder="98765 43210" value={phone}
                      onChange={e=>{setPhone(e.target.value);setErrors(p=>({...p,phone:""}));}}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition ${errors.phone?"border-red-300 focus:ring-red-100":"border-gray-200 focus:ring-indigo-200 focus:border-indigo-400"}`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                {(selectedDate||selectedTime) && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-1.5 mb-5">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Your Selection</p>
                    {selectedDate && <p className="text-sm font-semibold text-gray-800">📅 {DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]}</p>}
                    {selectedTime && <p className="text-sm font-semibold text-gray-800">🕐 {selectedTime}</p>}
                  </div>
                )}
                <button onClick={handleContinue}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${isReady?"bg-gray-900 hover:bg-gray-800 text-white shadow-md active:scale-[0.99]":"bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  {isReady ? "Continue →" : "Select date & time to continue"}
                </button>
              </div>

              {/* COL 2: Calendar */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </span>Select Date
                </h2>
                <DesktopCalendar selected={selectedDate} onSelect={d=>{setSelectedDate(d);setErrors(p=>({...p,date:""}));}}/>
                {errors.date && <p className="text-xs text-red-500 mt-3">{errors.date}</p>}
                {selectedDate && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-gray-900 rounded-xl">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span className="text-sm font-semibold text-white">{DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                  </div>
                )}
              </div>

              {/* COL 3: Time Slots */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </span>Select Time
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {TIME_SLOTS.map(slot=>{
                    const sel=selectedTime===slot;
                    return (
                      <button key={slot} onClick={()=>{setSelectedTime(slot);setErrors(p=>({...p,time:""}));}}
                        className={`py-3.5 rounded-xl text-sm font-semibold transition-all text-center ${sel?"bg-gray-900 text-white shadow-md":"bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-400 hover:bg-gray-100"}`}>
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {errors.time && <p className="text-xs text-red-500 mt-3">{errors.time}</p>}
                {selectedTime && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-gray-900 rounded-xl">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span className="text-sm font-semibold text-white">{selectedTime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-40">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map(({key,label,Icon})=>(
              <button key={key}
                onClick={()=>{ setActiveNav(key); if(key==="home") router.push("/patient"); if(key==="upcoming") router.push("/upcoming"); }}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all">
                <Icon active={activeNav===key}/>
                <span className={`text-[10px] font-semibold ${activeNav===key?"text-indigo-600":"text-gray-400"}`}>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Booking error banner */}
      {bookingError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg">
          {bookingError}
        </div>
      )}

      {/* OTP Overlay */}
      {step==="otp" && (
        <OtpOverlay phone={phone} onVerified={handleOtpVerified} onBack={()=>setStep("form")}/>
      )}

      {/* Loading overlay while booking */}
      {bookingLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            <p className="text-sm font-semibold text-gray-700">Confirming your booking…</p>
          </div>
        </div>
      )}

      {/* Confirmed Modal */}
      {step==="confirmed" && (
        <ConfirmModal name={name} phone={phone} date={selectedDate} time={selectedTime!}
          onClose={()=>router.push("/upcoming")}/>
      )}
    </div>
  );
}
