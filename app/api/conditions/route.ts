import { NextResponse } from "next/server";
import { getAccessToken, getConditionList } from "@/lib/kiwoom";

export async function GET() {
  try {
    const { token } = await getAccessToken();
    const conditions = await getConditionList(token);
    return NextResponse.json({ conditions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
