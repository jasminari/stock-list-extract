"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

/**
 * 만족도 척도. 값(1~5)은 DB에 그대로 저장되므로 순서를 바꾸면 과거 데이터와 어긋난다.
 */
const RATINGS = [
  { value: 1, emoji: "😞", label: "별로예요" },
  { value: 2, emoji: "🙁", label: "아쉬워요" },
  { value: 3, emoji: "😐", label: "보통이에요" },
  { value: 4, emoji: "🙂", label: "좋아요" },
  { value: 5, emoji: "😍", label: "최고예요" },
];

const MAX_MESSAGE_LENGTH = 1000;

export default function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setRating(null);
    setMessage("");
    setError(null);
    setDone(false);
    setOpen(true);
    track("Feedback Opened", { pagePath: pathname });
  }

  const canSubmit = rating !== null || message.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message: message.trim(), pagePath: pathname }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "의견을 보내지 못했습니다.");
        return;
      }
      track("Feedback Submitted", {
        rating,
        hasMessage: message.trim().length > 0,
        pagePath: pathname,
      });
      setDone(true);
      // 감사 인사를 잠깐 보여주고 닫는다
      setTimeout(() => setOpen(false), 1600);
    } catch {
      setError("의견을 보내지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* 플로팅 버튼 — 모바일에서는 하단 탭바 위로 띄운다 */}
      <button
        onClick={openModal}
        aria-label="의견 보내기"
        className={`fixed ${pathname?.startsWith("/dashboard/chart") ? "bottom-[14rem]" : "bottom-24"} right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-1.5 px-3 py-2 bg-background border border-border rounded-full shadow-lg shadow-foreground/10 text-foreground/80 hover:text-primary-hover hover:border-primary/40 hover:bg-accent transition-colors`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.2A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-xs font-medium">의견</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* 키보드가 올라오거나 화면이 짧으면 시트가 넘치므로 본문 안에서 스크롤한다 */}
        <DialogContent size="md">
          {done ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <DialogTitle className="mt-3 text-sm font-medium text-foreground">
                의견 감사합니다!
              </DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                보내주신 내용은 개선에 참고하겠습니다.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader description="짧은 의견도 큰 도움이 됩니다.">
                서비스에 만족하시나요?
              </DialogHeader>

              <DialogBody>
                {/* 만족도 */}
                <div className="flex items-center justify-between gap-1">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRating(rating === r.value ? null : r.value)}
                      aria-pressed={rating === r.value}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        rating === r.value
                          ? "border-primary/60 bg-accent"
                          : "border-transparent hover:bg-muted"
                      }`}
                    >
                      <span className={`text-2xl transition-transform ${rating === r.value ? "scale-110" : ""}`}>
                        {r.emoji}
                      </span>
                      <span
                        className={`text-[11px] leading-tight ${
                          rating === r.value ? "font-medium text-primary-hover" : "text-muted-foreground"
                        }`}
                      >
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 자유 의견 */}
                <div className="mt-4">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    rows={4}
                    aria-label="의견"
                    placeholder="불편한 점, 있으면 좋겠는 기능을 자유롭게 적어주세요. (선택)"
                    className="w-full resize-none rounded-xl border-0 bg-muted px-3 py-2.5 text-sm transition-colors focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">
                    {message.length}/{MAX_MESSAGE_LENGTH}
                  </p>
                </div>

                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              </DialogBody>

              <DialogFooter className="pb-5">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? "보내는 중..." : "의견 보내기"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
