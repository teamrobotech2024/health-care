import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "name, email and password are all required.",
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

    // Public registrations are ALWAYS assigned the 'patient' role in RBAC
    const assignedRole = "patient";

    const origin = req.headers.get("origin") || req.nextUrl.origin;
    let userId: string | undefined;
    let userEmail: string | undefined;

    if (supabaseAdmin) {
      // Use Admin API to create user with email pre-confirmed
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: assignedRole },
      });

      if (adminError) {
        return NextResponse.json(
          {
            error: "SignupError",
            message: adminError.message,
          },
          { status: 400 }
        );
      }

      userId = adminData.user.id;
      userEmail = adminData.user.email;
    } else {
      // Fallback to standard signUp if admin key is not available
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: assignedRole },
          emailRedirectTo: `${origin}/auth/verify`,
        },
      });

      if (error) {
        return NextResponse.json(
          {
            error: "SignupError",
            message: error.message,
          },
          { status: 400 }
        );
      }

      userId = data.user?.id;
      userEmail = data.user?.email;
    }

    if (userId) {
      const client = supabaseAdmin || supabase;
      const { error: profileError } = await client.from("profiles").upsert({
        id: userId,
        name,
        role: assignedRole,
      });

      if (profileError) {
        console.warn("Profile upsert failed:", profileError.message);
      }
    }

    return NextResponse.json(
      {
        message: "Account created successfully! You can now log in.",
        user: {
          id: userId,
          email: userEmail,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
