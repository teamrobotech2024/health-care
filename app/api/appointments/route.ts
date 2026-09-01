import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
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
    const { patient_name, phone, date, time, doctor_id, doctor_name, hospital_name } = body;

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
    const client = supabaseAdmin || supabase;

    let insertResult = await client
      .from("appointments")
      .insert({
        user_id: authRes.user.id,
        doctor_id: doctor_id || null,
        doctor_name: doctor_name || "",
        hospital_name: hospital_name || "",
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

    // Fallback if doctor_id column is missing in Supabase schema cache before running migration
    if (insertResult.error && (insertResult.error.code === "PGRST204" || insertResult.error.message.includes("doctor_id"))) {
      console.warn("Schema cache missing doctor_id column. Falling back to basic appointment insertion...");
      insertResult = await client
        .from("appointments")
        .insert({
          user_id: authRes.user.id,
          short_id: shortId,
          patient_name,
          phone,
          date,
          time,
          status: "Pending",
          note: doctor_name ? `Doctor: ${doctor_name} (${hospital_name})` : "Your request has been received and is pending confirmation.",
        })
        .select()
        .single();
    }

    if (insertResult.error) {
      console.error("Appointment insert error:", insertResult.error);
      return NextResponse.json(
        { error: "DatabaseError", message: insertResult.error.message },
        { status: 500 }
      );
    }

    // Automatically trigger notification for the assigned doctor
    const targetDoctorId = insertResult.data.doctor_id || doctor_id;
    if (targetDoctorId) {
      try {
        await client.from("notifications").insert({
          doctor_id: targetDoctorId,
          appointment_id: insertResult.data.id,
          title: "New Appointment Booking",
          message: `Patient ${patient_name} (${phone}) booked an appointment for ${date} at ${time}.`,
          read: false,
        });
      } catch (notifErr) {
        console.warn("Doctor notification insertion warning:", notifErr);
      }
    }

    return NextResponse.json(
      {
        message: "Appointment booked successfully!",
        appointment: insertResult.data,
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
