import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const authRes = await authenticateRequest(req);
    if (authRes instanceof NextResponse) return authRes;

    const client = supabaseAdmin || supabase;

    // Find Doctor record for current user
    const { data: doctorRecord } = await client
      .from("doctors")
      .select("id")
      .eq("user_id", authRes.user.id)
      .single();

    if (!doctorRecord) {
      return NextResponse.json({ notifications: [] });
    }

    const { data: notifications, error } = await client
      .from("notifications")
      .select("*")
      .eq("doctor_id", doctorRecord.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authRes = await authenticateRequest(req);
    if (authRes instanceof NextResponse) return authRes;

    const body = await req.json();
    const { id, readAll } = body;

    const client = supabaseAdmin || supabase;

    if (readAll) {
      const { data: doctorRecord } = await client
        .from("doctors")
        .select("id")
        .eq("user_id", authRes.user.id)
        .single();

      if (doctorRecord) {
        await client
          .from("notifications")
          .update({ read: true })
          .eq("doctor_id", doctorRecord.id);
      }
      return NextResponse.json({ message: "All notifications marked as read." });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Notification ID is required." },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "UpdateError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Notification marked as read", notification: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
