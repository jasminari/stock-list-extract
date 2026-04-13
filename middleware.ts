import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
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
    "/api/((?!auth).*)",
  ],
};
