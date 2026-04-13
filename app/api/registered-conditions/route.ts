import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import {
  listRegisteredConditions,
  registerCondition,
  unregisterCondition,
} from "@/lib/storage-db";

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

export async function POST(req: NextRequest) {
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

    const condition = await registerCondition(seq, name);
    return NextResponse.json({ condition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
