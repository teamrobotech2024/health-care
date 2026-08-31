import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabase";

export type AuthContext = {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    name: string;
    role: "patient" | "admin";
  };
  token: string;
};

export async function authenticateRequest(
  req: NextRequest
): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Missing or malformed Authorization header. Expected: Bearer <token>",
      },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid or expired token. Please log in again.",
      },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", data.user.id)
    .single();

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    profile: (profile as { name: string; role: "patient" | "admin" }) || {
      name: data.user.email || "",
      role: "patient",
    },
    token,
  };
}

export function requireAdmin(
  authCtx: AuthContext
): NextResponse | null {
  if (authCtx.profile.role !== "admin") {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Access denied. Admin role required.",
      },
      { status: 403 }
    );
  }
  return null;
}
