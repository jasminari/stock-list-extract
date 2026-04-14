import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import {
  listRegisteredConditions,
  registerCondition,
  unregisterCondition,
} from "@/lib/storage-db";

// GET은 모든 로그인 유저 접근 가능 (설정 페이지에서 목록 조회용)
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "DB가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const conditions = await listRegisteredConditions();
    return NextResponse.json({ conditions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST/DELETE는 admin만
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "DB가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const { seq, name } = await req.json();
    if (!seq || !name) {
      return NextResponse.json(
        { error: "seq와 name이 필요합니다." },
        { status: 400 }
      );
    }

    const conditions = await listRegisteredConditions();
    if (conditions.length >= 3) {
      return NextResponse.json(
        { error: "최대 3개까지만 등록할 수 있습니다." },
        { status: 400 }
      );
    }

    const condition = await registerCondition(seq, name);
    return NextResponse.json({ condition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "DB가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const { seq } = await req.json();
    if (!seq) {
      return NextResponse.json(
        { error: "seq가 필요합니다." },
        { status: 400 }
      );
    }

    await unregisterCondition(seq);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
