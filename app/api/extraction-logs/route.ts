import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { listExtractionLogs } from "@/lib/storage-db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const logs = await listExtractionLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
