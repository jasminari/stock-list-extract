"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = "53e411903413da2d8a37db6199e1e725";

// 앱 생명주기 동안 단 한 번만 초기화되도록 모듈 스코프에 플래그 유지
let initialized = false;

export default function AmplitudeProvider() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    amplitude.initAll(AMPLITUDE_API_KEY, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
  }, []);

  // 로그인 상태에 따라 Amplitude user id 동기화
  useEffect(() => {
    if (status === "loading") return;

    if (session?.user?.id) {
      // Amplitude는 user_id가 최소 5자여야 하므로 접두사를 붙인다.
      // (이 앱의 user id는 DB integer라 "1" 같은 1~2자가 나온다)
      amplitude.setUserId(`user_${session.user.id}`);
      const identify = new amplitude.Identify();
      identify.set("role", session.user.role ?? "user");
      identify.set("app_user_id", session.user.id);
      amplitude.identify(identify);
    } else {
      amplitude.setUserId(undefined);
    }
  }, [session, status]);

  return null;
}
