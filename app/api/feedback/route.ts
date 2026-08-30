import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { saveFeedback, countRecentFeedbacks } from "@/lib/storage-db";

/** 한 사람이 하루에 남길 수 있는 의견 수 */
const DAILY_LIMIT = 10;
const MAX_MESSAGE_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const body = await req.json();

    // 만족도만, 또는 글만 남기는 것도 허용한다. 둘 다 비었을 때만 막는다.
    const rawRating = body?.rating;
    let rating: number | null = null;
    if (rawRating !== null && rawRating !== undefined && rawRating !== "") {
      const n = Number(rawRating);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: "잘못된 만족도 값입니다." }, { status: 400 });
      }
      rating = n;
    }

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (rating === null && !message) {
      return NextResponse.json(
        { error: "만족도를 선택하거나 의견을 적어주세요." },
        { status: 400 }
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `의견은 ${MAX_MESSAGE_LENGTH}자까지 쓸 수 있습니다.` },
        { status: 400 }
      );
    }

    const pagePath =
      typeof body?.pagePath === "string" ? body.pagePath.slice(0, 200) : "";

    const userId = Number(session.user.id);
    if ((await countRecentFeedbacks(userId)) >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: "오늘은 의견을 충분히 보내주셨어요. 내일 다시 받을게요." },
        { status: 429 }
      );
    }

    const id = await saveFeedback({ userId, rating, message, pagePath });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
