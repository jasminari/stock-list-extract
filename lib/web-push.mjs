import webpush from 'web-push';

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

// Only known browser push services are accepted; never send server requests to arbitrary client URLs.
export function isAllowedPushEndpoint(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      (u.hostname === 'web.push.apple.com' || u.hostname.endsWith('.push.apple.com') ||
       u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com');
  } catch { return false; }
}

export async function sendPush(subscription, payload) {
  if (!isPushConfigured()) throw new Error('푸시 서버 설정이 필요합니다.');
  if (!isAllowedPushEndpoint(subscription.endpoint)) throw new Error('지원하지 않는 푸시 주소입니다.');
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: {
      subject: process.env.VAPID_SUBJECT,
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    },
    TTL: 3600,
    urgency: 'high',
    timeout: 10000,
  });
}
