import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { and, eq, or, isNull, lt } from 'drizzle-orm';
import { isPushConfigured, sendPush } from '@/lib/web-push.mjs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  if (!isPushConfigured()) return NextResponse.json({ error: '푸시 서버 설정이 필요합니다.' }, { status: 503 });
  const data = await req.json().catch(() => null);
  if (typeof data?.endpoint !== 'string') return NextResponse.json({ error: '먼저 이 기기의 알림을 켜주세요.' }, { status: 400 });
  try {
    const db = getDb();
    const [sub] = await db.update(pushSubscriptions).set({ lastTestAt: new Date() }).where(and(
      eq(pushSubscriptions.userId, Number(session.user.id)), eq(pushSubscriptions.endpoint, data.endpoint),
      or(isNull(pushSubscriptions.lastTestAt), lt(pushSubscriptions.lastTestAt, new Date(Date.now() - 30000)))
    )).returning();
    if (!sub) return NextResponse.json({ error: '알림 등록을 확인하거나 30초 뒤 다시 시도해주세요.' }, { status: 429 });
    try {
      await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, {
        title: '테스트 알림', body: '이 기기로 관심종목 가격 알림을 받을 수 있습니다.', tag: 'push-test', url: '/dashboard/watchlist',
      });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        return NextResponse.json({ error: '기기 등록이 만료되었습니다. 알림을 다시 켜주세요.' }, { status: 410 });
      }
      return NextResponse.json({ error: '푸시 서비스 전송에 실패했습니다. 잠시 뒤 다시 시도해주세요.' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '테스트 알림을 보내지 못했습니다.' }, { status: 500 });
  }
}
