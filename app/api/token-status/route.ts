import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/kiwoom";

export async function GET() {
  try {
    const { token, expires_dt } = await getAccessToken();
    return NextResponse.json({
      status: "connected",
      expiresAt: expires_dt,
      tokenPrefix: token.slice(0, 8) + "...",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({
      status: "error",
      message,
    });
  }
}
