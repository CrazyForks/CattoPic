import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.API_URL || "",
    remotePatterns: process.env.NEXT_PUBLIC_REMOTE_PATTERNS || "",
  });
}
