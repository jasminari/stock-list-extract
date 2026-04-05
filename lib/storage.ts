import path from "path";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import { StockResult } from "./kiwoom";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveResultAsExcel(
  fileName: string,
  conditionName: string,
  stocks: StockResult[]
): Promise<string> {
  await ensureDataDir();

  const rows = stocks.map((s) => ({
    종목코드: s.code,
    종목명: s.name,
    현재가: Number(s.price.replace(/^[+-]/, "")),
    전일대비: s.change,
    등락율: s.change_rate,
    누적거래량: Number(s.volume),
    시가: Number(s.open.replace(/^[+-]/, "")),
    고가: Number(s.high.replace(/^[+-]/, "")),
    저가: Number(s.low.replace(/^[+-]/, "")),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // 컬럼 너비 설정
  ws["!cols"] = [
    { wch: 12 }, // 종목코드
    { wch: 20 }, // 종목명
    { wch: 12 }, // 현재가
    { wch: 12 }, // 전일대비
    { wch: 10 }, // 등락율
    { wch: 16 }, // 누적거래량
    { wch: 12 }, // 시가
    { wch: 12 }, // 고가
    { wch: 12 }, // 저가
  ];

  XLSX.utils.book_append_sheet(wb, ws, conditionName.slice(0, 31));

  const filePath = path.join(DATA_DIR, `${fileName}.xlsx`);
  XLSX.writeFile(wb, filePath);
  return filePath;
}

export async function saveResultAsJson(
  fileName: string,
  data: unknown
): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export interface ResultMeta {
  fileName: string;
  date: string;
  conditionName: string;
  count: number;
  createdAt: string;
}

export async function listResults(): Promise<ResultMeta[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

  const results: ResultMeta[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
      const data = JSON.parse(raw) as {
        date: string;
        conditionName: string;
        stocks: unknown[];
      };
      const stat = await fs.stat(path.join(DATA_DIR, file));
      results.push({
        fileName: file.replace(".json", ".xlsx"),
        date: data.date,
        conditionName: data.conditionName,
        count: data.stocks?.length ?? 0,
        createdAt: stat.mtime.toISOString(),
      });
    } catch {
      // 손상된 파일은 건너뜀
    }
  }
  return results;
}
