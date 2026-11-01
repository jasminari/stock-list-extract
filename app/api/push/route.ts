import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { pushSubscriptions, pushDeliveries } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { isAllowedPushEndpoint, isPushConfigured } from '@/lib/web-push.mjs';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await auth())?.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return NextResponse.json({ configured: isPushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY || '' });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  if (!isPushConfigured()) return NextResponse.json({ error: '푸시 서버 설정이 필요합니다.' }, { status: 503 });
  const data = await req.json().catch(() => null);
  if (!data || typeof data.endpoint !== 'string' || data.endpoint.length > 4096 || !isAllowedPushEndpoint(data.endpoint) ||
      typeof data.keys?.p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}=?$/.test(data.keys.p256dh) ||
      typeof data.keys?.auth !== 'string' || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(data.keys.auth)) {
    return NextResponse.json({ error: '올바른 기기 알림 정보가 필요합니다.' }, { status: 400 });
  }
  try {
    const values = { userId: Number(session.user.id), endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth };
    // A browser endpoint belongs to the currently signed-in account only.
    await getDb().transaction(async (tx) => {
      const [previous] = await tx.select().from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, data.endpoint)).for('update');
      if (previous && previous.userId !== values.userId) {
        await tx.delete(pushDeliveries).where(eq(pushDeliveries.subscriptionId, previous.id));
      }
      await tx.insert(pushSubscriptions).values(values)
        .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '기기 알림 등록에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const data = await req.json().catch(() => null);
  if (typeof data?.endpoint !== 'string') return NextResponse.json({ error: '기기 정보가 필요합니다.' }, { status: 400 });
  try {
    await getDb().delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, Number(session.user.id)), eq(pushSubscriptions.endpoint, data.endpoint)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '알림 해제에 실패했습니다.' }, { status: 500 });
  }
}
