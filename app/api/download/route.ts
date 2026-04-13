import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import { isDbConfigured } from "@/lib/db";
import { getSearchResultStocks } from "@/lib/storage-db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get("file");
  const resultId = searchParams.get("resultId");

  // DB 기반 다운로드
  if (resultId && isDbConfigured()) {
    const id = Number(resultId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "유효하지 않은 ID" }, { status: 400 });
    }

    const stocks = await getSearchResultStocks(id);
    if (stocks.length === 0) {
      return NextResponse.json({ error: "데이터가 없습니다" }, { status: 404 });
    }

    const rows = stocks.map((s) => ({
      종목코드: s.code,
      종목명: s.name,
      현재가: Number(s.price.replace(/^[+-]/, "")),
      전일대비: s.change,
      등락율: s.changeRate,
      누적거래량: Number(s.volume),
      거래대금_천원: Number(s.tradingAmount || "0"),
      시가: Number(s.open.replace(/^[+-]/, "")),
      고가: Number(s.high.replace(/^[+-]/, "")),
      저가: Number(s.low.replace(/^[+-]/, "")),
      키워드: s.keyword,
      상승이유: s.reason,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "결과");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const downloadName = fileName || `result_${resultId}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      },
    });
  }

  // 파일 기반 다운로드
  if (!fileName || fileName.includes("..") || !fileName.endsWith(".xlsx")) {
    return NextResponse.json({ error: "잘못된 파일명입니다" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", fileName);

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }
}
