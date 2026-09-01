import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) return authResult;

    const client = supabaseAdmin || supabase;

    const { data: doctors, error } = await client
      .from("doctors")
      .select("id, user_id, name, profession, hospital_name, address, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching doctors for patient:", error);
      return NextResponse.json(
        { error: "DatabaseError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ doctors: doctors || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
