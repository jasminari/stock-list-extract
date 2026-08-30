"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

  // 모달 열려있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openModal() {
    setRating(null);
    setMessage("");
    setError(null);
    setDone(false);
    setOpen(true);
    track("Feedback Opened", { pagePath: pathname });
  }

  function close() {
    setOpen(false);
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
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full shadow-lg shadow-gray-900/10 text-gray-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.2A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-xs font-medium">의견</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center"
            onClick={close}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {done ? (
                <div className="px-6 py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-3">
                    의견 감사합니다!
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    보내주신 내용은 개선에 참고하겠습니다.
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        서비스에 만족하시나요?
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        짧은 의견도 큰 도움이 됩니다.
                      </p>
                    </div>
                    <button
                      onClick={close}
                      aria-label="닫기"
                      className="text-gray-400 hover:text-gray-600 -mr-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-5 py-4">
                    {/* 만족도 */}
                    <div className="flex items-center justify-between gap-1">
                      {RATINGS.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setRating(rating === r.value ? null : r.value)}
                          aria-pressed={rating === r.value}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors ${
                            rating === r.value
                              ? "border-indigo-400 bg-indigo-50"
                              : "border-transparent hover:bg-gray-50"
                          }`}
                        >
                          <span className={`text-2xl transition-transform ${rating === r.value ? "scale-110" : ""}`}>
                            {r.emoji}
                          </span>
                          <span
                            className={`text-[10px] leading-tight ${
                              rating === r.value ? "text-indigo-700 font-medium" : "text-gray-400"
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
                        placeholder="불편한 점, 있으면 좋겠는 기능을 자유롭게 적어주세요. (선택)"
                        className="w-full px-3 py-2.5 bg-gray-100 border-0 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      />
                      <p className="text-[11px] text-gray-400 text-right mt-1">
                        {message.length}/{MAX_MESSAGE_LENGTH}
                      </p>
                    </div>

                    {error && (
                      <p className="text-xs text-red-600 mt-2">{error}</p>
                    )}
                  </div>

                  <div className="px-5 pb-5 pt-1">
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || submitting}
                      className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
                    >
                      {submitting ? "보내는 중..." : "의견 보내기"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
