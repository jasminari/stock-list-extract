import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { updateAnnotation } from "@/lib/storage-db";

export async function PATCH(req: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: "DB가 설정되지 않았습니다" },
        { status: 503 }
      );
    }

    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;

    const { stockEntryId, keyword, reason } = await req.json();

    if (!stockEntryId || typeof stockEntryId !== "number") {
      return NextResponse.json(
        { error: "stockEntryId가 필요합니다" },
        { status: 400 }
      );
    }

    await updateAnnotation(stockEntryId, userId, keyword, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
