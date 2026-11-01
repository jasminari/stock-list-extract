import test from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import { isAllowedPushEndpoint, sendPush } from '../lib/web-push.mjs';

test('push endpoints cannot target arbitrary or local server URLs', () => {
  for (const endpoint of ['http://web.push.apple.com/a', 'https://localhost/a', 'https://127.0.0.1/', 'https://fcm.googleapis.com.attacker.test/', 'https://u:p@web.push.apple.com/a', 'https://web.push.apple.com:8787/a', 'not a URL']) {
    assert.equal(isAllowedPushEndpoint(endpoint), false, endpoint);
  }
  for (const endpoint of ['https://web.push.apple.com/a', 'https://fcm.googleapis.com/fcm/send/a', 'https://updates.push.services.mozilla.com/wpush/v2/a']) assert.equal(isAllowedPushEndpoint(endpoint), true);
});

test('sender serializes exactly once, sets VAPID and propagates provider errors', async (t) => {
  const keys = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, { VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:test@example.com' });
  t.after(() => { for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; });
  const sub = { endpoint: 'https://web.push.apple.com/a', keys: { p256dh: 'key', auth: 'auth' } };
  const payload = { title: '목표가 도달', body: '10,000원', url: '/dashboard/watchlist', tag: 'price-1' };
  const mock = t.mock.method(webpush, 'sendNotification', async (actualSub, body, options) => {
    assert.deepEqual(actualSub, sub); assert.deepEqual(JSON.parse(body), payload);
    assert.equal(options.vapidDetails.privateKey, 'private'); assert.equal(options.timeout, 10000);
    return { statusCode: 201 };
  });
  assert.equal((await sendPush(sub, payload)).statusCode, 201);
  mock.mock.mockImplementation(async () => { throw Object.assign(new Error('expired'), { statusCode: 410 }); });
  await assert.rejects(sendPush(sub, payload), { statusCode: 410 });
  delete process.env.VAPID_PRIVATE_KEY;
  await assert.rejects(sendPush(sub, payload), /설정/);
});
