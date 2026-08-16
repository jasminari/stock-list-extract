import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { listUsers, updateUserRole, countAdmins } from "@/lib/storage-db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
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
    const userId = Number(body?.userId);
    const role = body?.role;

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "잘못된 사용자입니다." }, { status: 400 });
    }
    if (role !== "user" && role !== "admin") {
      return NextResponse.json({ error: "잘못된 권한 값입니다." }, { status: 400 });
    }

    // 본인 강등 차단 — 세션의 role은 JWT에 박혀 있어 즉시 반영되지 않고,
    // 마지막 관리자가 스스로를 내리면 관리 화면에 아무도 못 들어간다.
    if (String(session.user.id) === String(userId) && role === "user") {
      return NextResponse.json(
        { error: "본인의 관리자 권한은 해제할 수 없습니다." },
        { status: 400 }
      );
    }

    // 다른 경로로 마지막 관리자가 사라지는 경우도 방어
    if (role === "user" && (await countAdmins()) <= 1) {
      return NextResponse.json(
        { error: "마지막 관리자는 해제할 수 없습니다." },
        { status: 400 }
      );
    }

    await updateUserRole(userId, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
