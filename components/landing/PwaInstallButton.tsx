"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const isAppleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // iPadOS 13+는 데스크톱 Safari로 위장하므로 터치 지원 여부로 추가 판별
  const isIpadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleTouch || isIpadOS;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export default function PwaInstallButton() {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setIos(isIosDevice());
    setInstalled(isStandaloneDisplay());
    setReady(true);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // 설치 완료/미지원 환경(설치 프롬프트도 없고 iOS도 아닌 경우)에는 버튼을 숨긴다
  if (!ready || installed || (!ios && !deferredPrompt)) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    if (ios) setShowIosGuide(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">앱 설치</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {showIosGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
            onClick={() => setShowIosGuide(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="flex w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-sm sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 pb-3 pt-4">
                <h3 className="text-base font-semibold text-gray-900">홈 화면에 추가하기</h3>
                <button
                  onClick={() => setShowIosGuide(false)}
                  aria-label="닫기"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4 px-5 py-5 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    1
                  </span>
                  <p className="min-w-0 pt-0.5">
                    Safari 하단(또는 상단) 메뉴에서{" "}
                    <Share className="inline h-4 w-4 -translate-y-0.5 text-indigo-600" /> 공유 버튼을 눌러주세요.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    2
                  </span>
                  <p className="min-w-0 pt-0.5">
                    메뉴를 아래로 내려{" "}
                    <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                      <SquarePlus className="h-4 w-4 text-indigo-600" />
                      홈 화면에 추가
                    </span>
                    를 선택하세요.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    3
                  </span>
                  <p className="min-w-0 pt-0.5">
                    오른쪽 위 <span className="font-medium text-gray-900">추가</span>를 누르면 홈 화면에 앱처럼 설치돼요.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-3">
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                >
                  확인했어요
                </button>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
