import { NextRequest, NextResponse } from "next/server";
import { collectOwnershipReport } from "@/lib/dart";
import { getCollectionDateStr } from "@/lib/date";

/**
 * 하루치 임원ㆍ주요주주 소유상황 공시 표.
 * 공시 원문을 건별로 받아 파싱하므로 응답까지 수 초가 걸린다.
 */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? getCollectionDateStr();
  if (!/^\d{8}$/.test(date)) {
    return NextResponse.json(
      { error: "date는 YYYYMMDD 형식이어야 합니다" },
      { status: 400 }
    );
  }

  try {
    const result = await collectOwnershipReport(date);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
