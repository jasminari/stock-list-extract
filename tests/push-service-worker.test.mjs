import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function setup() {
  const handlers = {}, shown = [], opened = [];
  vm.runInNewContext(source, { URL, fetch, self: {
    location: { origin: 'https://example.com' },
    addEventListener: (name, fn) => { handlers[name] = fn; },
    skipWaiting: () => {},
    registration: { showNotification: async (title, options) => shown.push({title, ...options}) },
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async url => opened.push(url) },
  } });
  return { handlers, shown, opened };
}

test('background push shows title/body and click opens watchlist', async () => {
  const {handlers, shown, opened} = setup(); let pending;
  handlers.push({ data: { json: () => ({title:'삼성전자 목표가',body:'70,000원 이상',tag:'price-1',url:'/dashboard/watchlist'}) }, waitUntil: p => {pending=p;} });
  await pending; assert.equal(shown[0].title, '삼성전자 목표가'); assert.equal(shown[0].tag, 'price-1');
  handlers.notificationclick({ notification: {data:shown[0].data,close(){}}, waitUntil:p=>{pending=p;} });
  await pending; assert.equal(opened[0], 'https://example.com/dashboard/watchlist');
});

test('push data cannot open an external origin', async () => {
  const {handlers, opened} = setup();
  handlers.notificationclick({ notification: {data:{url:'https://evil.example'},close(){}}, waitUntil(){} });
  assert.equal(opened.length, 0);
});
