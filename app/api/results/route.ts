import { NextResponse } from "next/server";
import { listResults } from "@/lib/storage";

export async function GET() {
  try {
    const results = await listResults();
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
