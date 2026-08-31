import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdmin } from "@/lib/server-auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  const adminCheck = requireAdmin(authRes);
  if (adminCheck) return adminCheck;

  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const client = supabaseAdmin || supabase;

    let query = client
      .from("appointments")
      .select(`
        id,
        short_id,
        patient_name,
        phone,
        date,
        time,
        status,
        note,
        created_at,
        user_id,
        profiles!appointments_user_id_fkey (
          name,
          role
        )
      `)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (status) query = query.eq("status", status);
    if (date) query = query.eq("date", date);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointments: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Admin appointments error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
