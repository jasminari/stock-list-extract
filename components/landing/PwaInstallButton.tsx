"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent size="sm">
          <DialogHeader className="px-5 sm:px-5">홈 화면에 추가하기</DialogHeader>

          <DialogBody className="flex flex-col gap-4 px-5 py-5 text-sm text-foreground/80 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                1
              </span>
              <p className="min-w-0 pt-0.5">
                Safari 하단(또는 상단) 메뉴에서{" "}
                <Share className="inline h-4 w-4 -translate-y-0.5 text-primary" /> 공유 버튼을 눌러주세요.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                2
              </span>
              <p className="min-w-0 pt-0.5">
                메뉴를 아래로 내려{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <SquarePlus className="h-4 w-4 text-primary" />
                  홈 화면에 추가
                </span>
                를 선택하세요.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                3
              </span>
              <p className="min-w-0 pt-0.5">
                오른쪽 위 <span className="font-medium text-foreground">추가</span>를 누르면 홈 화면에 앱처럼 설치돼요.
              </p>
            </div>
          </DialogBody>

          <DialogFooter className="border-t border-border/60 px-5 py-3 sm:px-5">
            <Button className="w-full font-bold" onClick={() => setShowIosGuide(false)}>
              확인했어요
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
