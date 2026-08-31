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
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Bad Request", message: "reason is required." },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", authRes.user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "NotFound", message: "Appointment not found." },
        { status: 404 }
      );
    }

    if (existing.status === "Cancelled") {
      return NextResponse.json(
        { error: "BadRequest", message: "Appointment is already cancelled." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "Cancelled",
        note: `Cancelled: ${reason}. Book a new one if needed.`,
      })
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
      message: "Appointment cancelled successfully.",
      appointment: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Cancel error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
