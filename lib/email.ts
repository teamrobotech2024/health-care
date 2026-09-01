import nodemailer from "nodemailer";

/**
 * Email Helper for HealthConnect.
 * Sends OTP verification emails via SMTP or Resend API.
 */

export async function sendEmailOtp(
  toEmail: string,
  otp: string
): Promise<{ success: boolean; provider: string; error?: string }> {
  const cleanEmail = toEmail.trim().toLowerCase();

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || "587", 10);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim() || `"HealthConnect" <${smtpUser || "noreply@healthconnect.com"}>`;

  // 1. Send via Nodemailer SMTP if credentials exist
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: cleanEmail,
        subject: `${otp} is your HealthConnect Appointment Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
            <h2 style="color: #4f46e5; text-align: center; margin-bottom: 8px;">HealthConnect</h2>
            <p style="text-align: center; color: #6b7280; font-size: 14px;">Appointment Verification</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 15px; color: #374151;">Hello,</p>
            <p style="font-size: 15px; color: #374151;">Use the following 6-digit OTP code to verify your email and confirm your appointment booking:</p>
            <div style="background-color: #f3f4f6; text-align: center; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${otp}</span>
            </div>
            <p style="font-size: 13px; color: #9ca3af; text-align: center;">This verification code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        `,
      });

      console.log(`[EMAIL SUCCESS] Sent OTP email to ${cleanEmail} (MsgID: ${info.messageId})`);
      return { success: true, provider: "smtp" };
    } catch (err: unknown) {
      console.error("[EMAIL ERROR] Nodemailer SMTP exception:", err);
    }
  }

  // 2. Send via Resend API if RESEND_API_KEY is set
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HealthConnect <onboarding@resend.dev>",
          to: cleanEmail,
          subject: `${otp} is your HealthConnect Verification Code`,
          html: `<p>Your appointment verification code is <strong>${otp}</strong>. Valid for 5 minutes.</p>`,
        }),
      });

      if (res.ok) {
        console.log(`[EMAIL SUCCESS] Resend API sent OTP email to ${cleanEmail}`);
        return { success: true, provider: "resend" };
      }
    } catch (err) {
      console.error("[EMAIL ERROR] Resend API exception:", err);
    }
  }

  // 3. Fallback Dev Terminal Logger
  console.log(`\n==================================================`);
  console.log(`📧 [DEV EMAIL OTP DISPATCH] Target Email: ${cleanEmail}`);
  console.log(`🔑 [VERIFICATION OTP CODE]: ${otp}`);
  console.log(`==================================================\n`);

  return { success: true, provider: "console-logger" };
}
