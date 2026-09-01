import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const authRes = await authenticateRequest(req);
    if (authRes instanceof NextResponse) return authRes;

    if (authRes.profile.role !== "doctor" && authRes.profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Doctor access required." },
        { status: 403 }
      );
    }

    const client = supabaseAdmin || supabase;

    // Find Doctor record for current user
    const { data: doctorRecord, error: doctorErr } = await client
      .from("doctors")
      .select("id, name, profession, hospital_name, address")
      .eq("user_id", authRes.user.id)
      .single();

    if (doctorErr || !doctorRecord) {
      // Fallback: If logged in user is admin or doctor record not found yet, return empty list or all if admin
      if (authRes.profile.role === "admin") {
        const { data: allAppts } = await client.from("appointments").select("*").order("date", { ascending: true });
        return NextResponse.json({ appointments: allAppts || [], doctor: null });
      }
      return NextResponse.json(
        { error: "NotFound", message: "Doctor profile record not found." },
        { status: 404 }
      );
    }

    // Fetch appointments assigned to this doctor
    const { data: appointments, error: apptErr } = await client
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctorRecord.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (apptErr) {
      console.error("Error fetching doctor appointments:", apptErr);
      return NextResponse.json(
        { error: "DatabaseError", message: apptErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      doctor: doctorRecord,
      appointments: appointments || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
