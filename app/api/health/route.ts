import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "health-care-frontend-embedded-api",
    timestamp: new Date().toISOString(),
  });
}
