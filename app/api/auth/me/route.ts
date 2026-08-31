import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  return NextResponse.json({
    user: {
      id: authRes.user.id,
      email: authRes.user.email,
      name: authRes.profile.name,
      role: authRes.profile.role,
    },
  });
}
