import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import {
  getUserSubscriptions,
  subscribeCondition,
  unsubscribeCondition,
} from "@/lib/storage-db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const userId = Number(session.user.id);
    const subscriptions = await getUserSubscriptions(userId);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const { conditionSeq } = await req.json();
    if (!conditionSeq) {
      return NextResponse.json({ error: "conditionSeq가 필요합니다." }, { status: 400 });
    }

    const userId = Number(session.user.id);
    await subscribeCondition(userId, conditionSeq);
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
    const { conditionSeq } = await req.json();
    if (!conditionSeq) {
      return NextResponse.json({ error: "conditionSeq가 필요합니다." }, { status: 400 });
    }

    const userId = Number(session.user.id);
    await unsubscribeCondition(userId, conditionSeq);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
