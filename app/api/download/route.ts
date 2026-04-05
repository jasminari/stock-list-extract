import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get("file");

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
