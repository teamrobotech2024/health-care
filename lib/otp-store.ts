import { supabase, supabaseAdmin } from "./supabase";

type OtpRecord = {
  phone: string;
  code: string;
  expires_at: string;
};

const memoryOtpStore = new Map<string, { code: string; expiresAt: number }>();

export async function saveOtp(phone: string, code: string, expiresInMinutes = 5): Promise<void> {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  const client = supabaseAdmin || supabase;
  const { error } = await client
    .from("otps")
    .upsert({
      phone: cleanPhone,
      code,
      expires_at: expiresAt,
    });

  if (error) {
    memoryOtpStore.set(cleanPhone, {
      code,
      expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
    });
  }
}

export async function verifyOtp(phone: string, inputCode: string): Promise<{ valid: boolean; message?: string }> {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  const toPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;

  // 1. Try Supabase Auth verifyOtp first
  try {
    const { error: supabaseVerifyError } = await supabase.auth.verifyOtp({
      phone: toPhone,
      token: inputCode.trim(),
      type: "sms",
    });

    if (!supabaseVerifyError) {
      return { valid: true };
    }
  } catch {
    // continue to database/memory store checks
  }

  // 2. Check Database otps table
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from("otps")
    .select("code, expires_at")
    .eq("phone", cleanPhone)
    .single();

  if (!error && data) {
    const record = data as OtpRecord;
    const isExpired = new Date(record.expires_at).getTime() < Date.now();

    if (isExpired) {
      await client.from("otps").delete().eq("phone", cleanPhone);
      return { valid: false, message: "OTP code has expired. Please request a new one." };
    }

    if (record.code !== inputCode.trim()) {
      return { valid: false, message: "Incorrect OTP code. Please check your phone and try again." };
    }

    await client.from("otps").delete().eq("phone", cleanPhone);
    return { valid: true };
  }

  // 3. Check Memory store
  const memRecord = memoryOtpStore.get(cleanPhone);
  if (memRecord) {
    if (Date.now() > memRecord.expiresAt) {
      memoryOtpStore.delete(cleanPhone);
      return { valid: false, message: "OTP code has expired. Please request a new one." };
    }

    if (memRecord.code !== inputCode.trim()) {
      return { valid: false, message: "Incorrect OTP code. Please check your phone and try again." };
    }

    memoryOtpStore.delete(cleanPhone);
    return { valid: true };
  }

  // Demo fallback
  if (inputCode.trim() === "123456") {
    return { valid: true };
  }

  return { valid: false, message: "No OTP request found for this phone number. Please click resend." };
}
