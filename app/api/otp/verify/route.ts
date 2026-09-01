import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  try {
    const body = await req.json();
    const { otp, email, phone } = body;
    const targetIdentifier = email || phone || authRes.user.email;

    if (!targetIdentifier || !otp) {
      return NextResponse.json(
        { error: "Bad Request", message: "OTP code and email/phone are required." },
        { status: 400 }
      );
    }

    const result = await verifyOtp(targetIdentifier, otp);

    if (!result.valid) {
      return NextResponse.json(
        { error: "InvalidOTP", message: result.message || "Invalid or expired OTP code." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Email OTP verified successfully!",
      verified: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Verify Email OTP error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
