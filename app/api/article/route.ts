import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db";
import { stockAnnotations } from "@/lib/db/schema";
import { fetchArticle } from "@/lib/article";

/**
 * 저장된 기사 링크의 본문을 리더 모드로 반환.
 * 임의 URL 프록시로 악용되지 않도록 stock_annotations.source_url에
 * 존재하는 URL만 허용한다.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: "DB가 설정되지 않았습니다" },
        { status: 503 }
      );
    }

    const url = req.nextUrl.searchParams.get("url");
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: "유효하지 않은 URL" }, { status: 400 });
    }

    // 저장된 기사 링크인지 확인 (open proxy 방지)
    const db = getDb();
    const known = await db
      .select({ id: stockAnnotations.id })
      .from(stockAnnotations)
      .where(eq(stockAnnotations.sourceUrl, url))
      .limit(1);

    if (known.length === 0) {
      return NextResponse.json(
        { error: "저장된 기사 링크가 아닙니다" },
        { status: 403 }
      );
    }

    const article = await fetchArticle(url);
    if (!article.body) {
      return NextResponse.json(
        { error: "본문을 추출하지 못했습니다", title: article.title },
        { status: 422 }
      );
    }

    return NextResponse.json({ ...article, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
