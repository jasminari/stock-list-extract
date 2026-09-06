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
    const { code, low, high } = await req.json();
    if (!code || typeof low !== "number" || typeof high !== "number") {
      return NextResponse.json(
        { error: "code, low, high가 필요합니다." },
        { status: 400 }
      );
    }
    if (low >= high) {
      return NextResponse.json(
        { error: "하한가는 상한가보다 낮아야 합니다." },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    await setPriceAlert(userId, code, Math.round(low), Math.round(high));
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
