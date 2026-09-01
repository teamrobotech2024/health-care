import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { authenticateRequest, requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) return authResult;

    const adminCheck = requireAdmin(authResult);
    if (adminCheck) return adminCheck;

    const client = supabaseAdmin || supabase;

    // Fetch all doctor profiles with their doctor details
    const { data: doctorsData, error } = await client
      .from("doctors")
      .select(`
        id,
        user_id,
        name,
        profession,
        hospital_name,
        address,
        created_at,
        profiles (
          role
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching doctors:", error);
      return NextResponse.json(
        { error: "FetchError", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ doctors: doctorsData || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) return authResult;

    const adminCheck = requireAdmin(authResult);
    if (adminCheck) return adminCheck;

    const body = await req.json();
    const { name, email, password, profession, hospital_name, address } = body;

    if (!name || !email || !password || !profession || !hospital_name || !address) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "name, email, password, profession, hospital_name, and address are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: "ConfigurationError",
          message: "Supabase Service Role Key is required to register doctors directly.",
        },
        { status: 500 }
      );
    }

    // 1. Create Auth user with pre-confirmed email and 'doctor' role metadata
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "doctor" },
    });

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "CreateDoctorError", message: userError?.message || "Failed to create user." },
        { status: 400 }
      );
    }

    const userId = userData.user.id;

    // 2. Set profile role to 'doctor'
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      name,
      role: "doctor",
    });

    if (profileError) {
      console.warn("Doctor profile role upsert warning:", profileError.message);
    }

    // 3. Create Doctor detail record
    const { data: doctorRecord, error: doctorError } = await supabaseAdmin
      .from("doctors")
      .insert({
        user_id: userId,
        name,
        profession,
        hospital_name,
        address,
      })
      .select()
      .single();

    if (doctorError) {
      console.error("Doctor detail record insertion failed:", doctorError);
      return NextResponse.json(
        { error: "DoctorRecordError", message: doctorError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Doctor registered successfully!",
        doctor: doctorRecord,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
