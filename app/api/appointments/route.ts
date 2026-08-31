import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", authRes.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointments: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Get appointments error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  try {
    const body = await req.json();
    const { patient_name, phone, date, time } = body;

    if (!patient_name || !phone || !date || !time) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "patient_name, phone, date, and time are all required.",
        },
        { status: 400 }
      );
    }

    const shortId = "REQ-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        user_id: authRes.user.id,
        short_id: shortId,
        patient_name,
        phone,
        date,
        time,
        status: "Pending",
        note: "Your request has been received and is pending confirmation.",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Appointment booked successfully!",
        appointment: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Book appointment error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
