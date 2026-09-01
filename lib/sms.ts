import { supabase } from "./supabase";

/**
 * SMS Helper for HealthConnect.
 * Supports Supabase Auth Phone SMS, Twilio (SMS & Verify API), Fast2SMS, or console logging fallback.
 */

export async function sendSmsOtp(phone: string, otp: string): Promise<{ success: boolean; provider: string; error?: string }> {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  const toPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;

  // 1. Try Supabase Native Phone Auth SMS first
  try {
    const { error: supabaseAuthError } = await supabase.auth.signInWithOtp({
      phone: toPhone,
    });

    if (!supabaseAuthError) {
      console.log(`[SMS SUCCESS] Supabase Auth dispatched SMS OTP to ${toPhone}`);
      return { success: true, provider: "supabase-auth" };
    } else if (supabaseAuthError.code !== "phone_provider_disabled") {
      console.warn(`[SMS WARNING] Supabase Auth Phone error (${supabaseAuthError.code}): ${supabaseAuthError.message}`);
    }
  } catch (err) {
    console.error("[SMS ERROR] Supabase Auth Phone exception:", err);
  }

  // 2. Try Twilio Verify API if TWILIO_VERIFY_SERVICE_SID is set
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  let twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const twilioVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  if (twilioAccountSid && twilioAuthToken && twilioVerifyServiceSid) {
    try {
      const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
      const params = new URLSearchParams({
        To: toPhone,
        Channel: "sms",
      });

      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${twilioVerifyServiceSid}/Verifications`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      const responseData = await res.json();
      if (res.ok && responseData.sid) {
        console.log(`[SMS SUCCESS] Twilio Verify sent OTP to ${toPhone} (SID: ${responseData.sid})`);
        return { success: true, provider: "twilio-verify" };
      } else {
        console.warn(`[SMS WARNING] Twilio Verify error: ${responseData.message || res.statusText}`);
      }
    } catch (err) {
      console.error("[SMS ERROR] Twilio Verify exception:", err);
    }
  }

  // 3. Try Standard Twilio SMS if credentials are set
  if (twilioAccountSid && twilioAuthToken && (twilioPhoneNumber || twilioMessagingServiceSid)) {
    try {
      const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
      const bodyParams: Record<string, string> = {
        To: toPhone,
        Body: `Your OTP for HealthConnect appointment verification is ${otp}. Valid for 5 minutes.`,
      };

      if (twilioMessagingServiceSid) {
        bodyParams.MessagingServiceSid = twilioMessagingServiceSid;
      } else if (twilioPhoneNumber) {
        if (!twilioPhoneNumber.startsWith("+")) {
          twilioPhoneNumber = twilioPhoneNumber.length === 10 ? `+91${twilioPhoneNumber}` : `+${twilioPhoneNumber}`;
        }
        bodyParams.From = twilioPhoneNumber;
      }

      const params = new URLSearchParams(bodyParams);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      const responseData = await res.json();

      if (res.ok && responseData.sid) {
        console.log(`[SMS SUCCESS] Twilio sent SMS OTP ${otp} to ${toPhone} (SID: ${responseData.sid})`);
        return { success: true, provider: "twilio" };
      } else {
        console.warn(`[SMS WARNING] Twilio API Error (${responseData.code || res.status}): ${responseData.message || res.statusText}`);
      }
    } catch (err) {
      console.error("[SMS ERROR] Twilio SMS exception:", err);
    }
  }

  // 4. Try Fast2SMS if API key is set
  const fast2smsApiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (fast2smsApiKey) {
    try {
      const numbers = cleanPhone.replace(/\D/g, "").slice(-10);
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: numbers,
        }),
      });

      const responseData = await res.json();

      if (res.ok && responseData.return) {
        console.log(`[SMS SUCCESS] Fast2SMS sent OTP ${otp} to ${numbers}`);
        return { success: true, provider: "fast2sms" };
      } else {
        console.warn("[SMS WARNING] Fast2SMS error:", responseData.message || res.statusText);
      }
    } catch (err) {
      console.error("[SMS ERROR] Fast2SMS exception:", err);
    }
  }

  // 5. Fallback / Dev logger
  console.log(`\n==================================================`);
  console.log(`📱 [DEV SMS LOG] Target Phone: ${toPhone}`);
  console.log(`🔑 [VERIFICATION OTP CODE]: ${otp}`);
  console.log(`==================================================\n`);

  return { success: true, provider: "console-logger" };
}
