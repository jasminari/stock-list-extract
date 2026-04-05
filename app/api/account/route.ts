import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/kiwoom";

export async function GET() {
  try {
    const { token } = await getAccessToken();

    const res = await fetch("https://api.kiwoom.com/api/dostk/acnt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "api-id": "ka00001",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
