import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { saveOtp } from "@/lib/otp-store";
import { sendEmailOtp } from "@/lib/email";

export async function POST(req: NextRequest) {
  const authRes = await authenticateRequest(req);
  if (authRes instanceof NextResponse) return authRes;

  try {
    const body = await req.json().catch(() => ({}));
    const targetEmail = body.email || authRes.user.email;

    if (!targetEmail || typeof targetEmail !== "string") {
      return NextResponse.json(
        { error: "Bad Request", message: "Registered email address not found." },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP code in store for targetEmail (expires in 5 mins)
    await saveOtp(targetEmail, otp, 5);

    // Send Email OTP
    const emailResult = await sendEmailOtp(targetEmail, otp);

    return NextResponse.json({
      message: `OTP code sent successfully to your registered email (${targetEmail})`,
      email: targetEmail,
      success: true,
      provider: emailResult.provider,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Send Email OTP error:", err);
    return NextResponse.json(
      { error: "InternalServerError", message },
      { status: 500 }
    );
  }
}
