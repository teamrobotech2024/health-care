import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdmin } from "@/lib/server-auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";

function generateStatusNote(status: string): string {
  const notes: Record<string, string> = {
    Confirmed: "Your appointment has been confirmed by the clinic.",
    Pending: "Your appointment request is under review.",
    Cancelled: "Your appointment has been cancelled by the clinic. Please rebook.",
    Rescheduled: "Your appointment has been rescheduled by the clinic. Please check the new time.",
  };
  return notes[status] || "";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  const adminCheck = requireAdmin(authRes);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, note } = body;

    const VALID_STATUSES = ["Confirmed", "Pending", "Cancelled", "Rescheduled"];

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const client = supabaseAdmin || supabase;

    const { data, error } = await client
      .from("appointments")
      .update({
        status,
        note: note || generateStatusNote(status),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "NotFound", message: "Appointment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Appointment status updated to ${status}.`,
      appointment: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Admin update status error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
