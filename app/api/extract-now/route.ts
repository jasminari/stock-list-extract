import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAccessToken, searchByCondition } from "@/lib/kiwoom";
import { isDbConfigured } from "@/lib/db";
import {
  saveSearchResult,
  listRegisteredConditions,
  saveExtractionLog,
} from "@/lib/storage-db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  let dateStr: string | undefined;
  try {
    const body = await req.json();
    dateStr = body.date;
  } catch {
    // body 없으면 오늘 날짜
  }

  if (!dateStr) {
    dateStr = new Date()
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Seoul",
      })
      .replace(/\. /g, "")
      .replace(".", "");
  }

  const results: { condition: string; count: number; error?: string }[] = [];

  try {
    const registered = await listRegisteredConditions();
    if (registered.length === 0) {
      return NextResponse.json({ error: "등록된 조건검색식이 없습니다." }, { status: 400 });
    }

    const { token } = await getAccessToken();

    for (const cond of registered) {
      try {
        const stocks = await searchByCondition(token, cond.seq);

        await saveSearchResult(dateStr, cond.seq, cond.name, stocks);
        await saveExtractionLog(dateStr, cond.seq, cond.name, stocks.length, "success");

        results.push({ condition: cond.name, count: stocks.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        await saveExtractionLog(dateStr, cond.seq, cond.name, 0, "error", msg).catch(() => {});
        results.push({ condition: cond.name, count: 0, error: msg });
      }
    }

    return NextResponse.json({
      message: `${results.length}개 조건검색 완료`,
      date: dateStr,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
