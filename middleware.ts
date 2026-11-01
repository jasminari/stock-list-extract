import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (process.env.DEV_PREVIEW === "1") {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      if (req.method === "GET" && req.nextUrl.pathname === "/api/article") return NextResponse.next();
      return NextResponse.json({ error: "읽기 전용 dev 환경입니다" }, { status: 403 });
    }
    if (req.nextUrl.pathname.startsWith("/dashboard")) return NextResponse.redirect(new URL("/dev/market", req.url));
  }
  if (req.nextUrl.pathname.startsWith("/api/auth")) return NextResponse.next();
  // DB 미설정 시 인증 우회 (로컬 개발 등)
  if (!process.env.POSTGRES_URL) {
    return NextResponse.next();
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 대시보드와 API만 보호 (랜딩, 로그인, 회원가입, 정적 파일 제외)
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
