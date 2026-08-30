import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { listFeedbacks, updateFeedbackStatus } from "@/lib/storage-db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const feedbacks = await listFeedbacks();
    return NextResponse.json({ feedbacks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    const status = body?.status;

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "잘못된 의견입니다." }, { status: 400 });
    }
    if (status !== "new" && status !== "done") {
      return NextResponse.json({ error: "잘못된 상태 값입니다." }, { status: 400 });
    }

    await updateFeedbackStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
