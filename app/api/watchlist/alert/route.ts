import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { setPriceAlert, clearPriceAlert } from "@/lib/storage-db";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const { code, low, high, direction = "range" } = await req.json();
    if (typeof code !== "string" || !/^\d{6}$/.test(code) ||
        !Number.isInteger(low) || !Number.isInteger(high) ||
        low <= 0 || high > 2147483647 || low > high ||
        !["range", "above", "below"].includes(direction) ||
        (direction !== "range" && low !== high)) {
      return NextResponse.json({ error: "종목코드와 양의 정수 가격, 알림 조건을 확인해주세요." }, { status: 400 });
    }
    const userId = Number(session.user.id);
    const updated = await setPriceAlert(userId, code, low, high, direction);
    if (!updated) return NextResponse.json({ error: "관심종목을 먼저 등록해주세요." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "code가 필요합니다." }, { status: 400 });
    }

    const userId = Number(session.user.id);
    await clearPriceAlert(userId, code);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
