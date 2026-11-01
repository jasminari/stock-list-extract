import type { PushSubscription, SendResult } from 'web-push';
export function isPushConfigured(): boolean;
export function isAllowedPushEndpoint(value: string): boolean;
export function sendPush(subscription: PushSubscription, payload: {title: string; body: string; tag?: string; url?: string}): Promise<SendResult>;
