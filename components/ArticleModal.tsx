"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ArticleModalProps {
  url: string;
  fallbackTitle?: string;
  onClose: () => void;
}

interface ArticleData {
  title: string;
  body: string;
}

export default function ArticleModal({
  url,
  fallbackTitle,
  onClose,
}: ArticleModalProps) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArticle(null);

    fetch(`/api/article?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          setError(data.error || "기사를 불러오지 못했습니다");
        } else {
          setArticle({ title: data.title, body: data.body });
        }
      })
      .catch(() => {
        if (!cancelled) setError("기사를 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  // 모달 열려있는 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="bg-white w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-gray-100">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-indigo-500 mb-1">
                기사 미리보기
              </p>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
                {article?.title || fallbackTitle || "기사"}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          </div>

          {/* 본문 */}
          <div className="overflow-y-auto px-4 sm:px-6 py-4 text-[13px] sm:text-sm leading-relaxed text-gray-700">
            {loading && (
              <div className="py-10 text-center text-gray-400 text-sm">
                기사를 불러오는 중…
              </div>
            )}
            {error && (
              <div className="py-10 text-center text-sm text-gray-500">
                <p className="mb-1">{error}</p>
                <p className="text-xs text-gray-400">
                  아래 원문 보기로 확인해주세요
                </p>
              </div>
            )}
            {article && (
              <p className="whitespace-pre-line">{article.body}</p>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-4 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400 truncate">
              {(() => {
                try {
                  return new URL(url).hostname;
                } catch {
                  return "";
                }
              })()}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors"
            >
              원문 보기 ↗
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
