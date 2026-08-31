import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { supabase } from "@/lib/supabase";

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

    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", id)
      .eq("user_id", authRes.user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "NotFound", message: "Appointment not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", authRes.user.id)
      .select()
      .single();

    if (error) {
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
    console.error("Reschedule error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
