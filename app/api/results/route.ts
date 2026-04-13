import { NextResponse } from "next/server";
import { listResults } from "@/lib/storage";
import { isDbConfigured } from "@/lib/db";
import { listSearchResults } from "@/lib/storage-db";

export async function GET() {
  try {
    if (isDbConfigured()) {
      const results = await listSearchResults();
      return NextResponse.json({ results });
    }

    // DB 미설정 시 파일 기반 fallback
    const results = await listResults();
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
