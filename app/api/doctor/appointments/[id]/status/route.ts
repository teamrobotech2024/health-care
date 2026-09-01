import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/server-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authRes = await authenticateRequest(req);
    if (authRes instanceof NextResponse) return authRes;

    if (authRes.profile.role !== "doctor" && authRes.profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Doctor or Admin role required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, note, date, time } = body;

    const client = supabaseAdmin || supabase;

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (note !== undefined) updates.note = note;
    if (date) updates.date = date;
    if (time) updates.time = time;

    const { data: updatedAppt, error } = await client
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating appointment status:", error);
      return NextResponse.json(
        { error: "UpdateError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Appointment updated successfully!",
      appointment: updatedAppt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
