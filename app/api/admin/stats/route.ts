import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdmin } from "@/lib/server-auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  const adminCheck = requireAdmin(authRes);
  if (adminCheck) return adminCheck;

  try {
    const client = supabaseAdmin || supabase;

    const { data, error } = await client
      .from("appointments")
      .select("status, created_at");

    if (error) {
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    const appointments = data || [];
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
    const pending = appointments.filter((a) => a.status === "Pending").length;
    const cancelled = appointments.filter((a) => a.status === "Cancelled").length;
    const rescheduled = appointments.filter((a) => a.status === "Rescheduled").length;

    const weeklyMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    appointments.forEach((appt) => {
      const day = new Date(appt.created_at).getDay();
      weeklyMap[DAY_NAMES[day]] = (weeklyMap[DAY_NAMES[day]] || 0) + 1;
    });

    const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      count: weeklyMap[day],
    }));

    return NextResponse.json({
      stats: { total, confirmed, pending, cancelled, rescheduled },
      weeklyData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
