import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { date, time } = body;

    const updatePayload: Record<string, string> = {
      status: "Rescheduled",
      note: "Your appointment has been rescheduled. New date confirmed.",
    };

    if (date) updatePayload.date = date;
    if (time) updatePayload.time = time;

    const client = supabaseAdmin || supabase;

    // Support lookup by UUID `id` or string `short_id`
    const { data: existingList, error: fetchError } = await client
      .from("appointments")
      .select("*")
      .or(`id.eq.${id},short_id.eq.${id}`);

    if (fetchError || !existingList || existingList.length === 0) {
      console.error("Reschedule appointment lookup error:", fetchError, "ID:", id);
      return NextResponse.json(
        { error: "NotFound", message: "Appointment not found." },
        { status: 404 }
      );
    }

    const existing = existingList[0];

    // Authorization check
    if (
      authRes.profile.role !== "admin" &&
      authRes.profile.role !== "doctor" &&
      existing.user_id !== authRes.user.id
    ) {
      return NextResponse.json(
        { error: "Forbidden", message: "You are not authorized to reschedule this appointment." },
        { status: 403 }
      );
    }

    const { data, error } = await client
      .from("appointments")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Reschedule update error:", error);
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Appointment rescheduled successfully.",
      appointment: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Reschedule exception:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
