import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getConditionList, searchByCondition } from "@/lib/kiwoom";
import { saveResultAsExcel, saveResultAsJson } from "@/lib/storage";
import { isDbConfigured } from "@/lib/db";
import { saveSearchResult } from "@/lib/storage-db";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { condition: string; count: number; error?: string }[] = [];

  try {
    const dateStr = new Date()
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Seoul",
      })
      .replace(/\. /g, "")
      .replace(".", "");

    const { token } = await getAccessToken();
    const conditions = await getConditionList(token);

    if (conditions.length === 0) {
      return NextResponse.json({ message: "조건검색식 없음", results });
    }

    for (const cond of conditions) {
      try {
        const stocks = await searchByCondition(token, cond.seq);
        const fileName = `${dateStr}_${cond.name}`;

        // 파일 저장
        await saveResultAsJson(fileName, {
          seq: cond.seq,
          conditionName: cond.name,
          date: dateStr,
          stocks,
        });
        await saveResultAsExcel(fileName, cond.name, stocks);

        // DB 저장
        if (isDbConfigured()) {
          try {
            await saveSearchResult(dateStr, cond.seq, cond.name, stocks);
          } catch (e) {
            console.error(`DB 저장 실패 [${cond.name}]:`, e);
          }
        }

        results.push({ condition: cond.name, count: stocks.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
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
