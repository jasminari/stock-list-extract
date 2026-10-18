"use client";

import { useEffect, useRef, useState } from "react";
import { AlignLeft, ExternalLink, RotateCw, X } from "lucide-react";

/** Keep the quiz mounted while the original website is open. */
export default function QuizArticleSheet({ article, onClose }: {
  article: { title: string; url: string };
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reload, setReload] = useState(0);
  const [reader, setReader] = useState(false);
  const [content, setContent] = useState<{ title: string; body: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!reader) return;
    const controller = new AbortController();
    setContent(null);
    setError(false);
    fetch(`/api/article?url=${encodeURIComponent(article.url)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Article unavailable");
        const data = await response.json();
        if (typeof data.body !== "string" || !data.body.trim()) throw new Error("Empty article");
        if (!controller.signal.aborted) setContent({ title: data.title || article.title, body: data.body });
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [reader, article.url, article.title, reload]);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    // Dialog focus restoration can scroll the article trigger into view.
    // Preserve every scrollable ancestor so closing returns to the exact position.
    const positions: { element: HTMLElement; top: number; left: number }[] = [];
    for (let parent = previous?.parentElement; parent; parent = parent.parentElement) {
      positions.push({ element: parent, top: parent.scrollTop, left: parent.scrollLeft });
    }
    const windowPosition = { top: window.scrollY, left: window.scrollX };
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
      for (const position of positions) {
        position.element.scrollTo({ top: position.top, left: position.left, behavior: "instant" });
      }
      window.scrollTo({ ...windowPosition, behavior: "instant" });
    };
  }, []);

  const source = new URL(article.url).hostname;
  return (
    <dialog ref={dialog} aria-label={`기사 브라우저: ${article.title}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden bg-white p-0 text-gray-900 backdrop:bg-black/40 sm:m-auto sm:h-[92dvh] sm:w-[calc(100%-3rem)] sm:max-w-4xl sm:rounded-2xl">
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button autoFocus onClick={onClose} aria-label="기사 닫고 퀴즈로 돌아가기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"><X className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1 rounded-xl bg-gray-100 px-3 py-2 text-center text-sm text-gray-600" title={article.url}><span className="block truncate">{source}</span></div>
          <button onClick={() => setReader((value) => !value)} aria-label={reader ? "원문 웹사이트 보기" : "모바일 본문 보기"} aria-pressed={reader} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${reader ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-100"}`}><AlignLeft className="h-5 w-5" /></button>
          <button onClick={() => setReload((value) => value + 1)} aria-label="기사 새로고침" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"><RotateCw className="h-5 w-5" /></button>
        </header>
        <iframe key={`${article.url}:${reload}`} src={article.url} title={article.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
          className={`${reader ? "hidden" : "min-h-0 w-full flex-1"} border-0 bg-white`} />
        {reader && <article className="min-h-0 flex-1 overflow-y-auto overscroll-contain break-words px-5 py-6">
          <p className="mb-3 text-xs text-gray-500">본문 보기 · {source}</p>
          <h2 className="text-xl font-bold leading-relaxed">{content?.title || article.title}</h2>
          {!content && !error && <p role="status" className="mt-5 text-sm text-gray-500">본문을 불러오는 중…</p>}
          {error && <p role="status" className="mt-5 text-sm text-gray-500">본문을 불러오지 못했어요. 원문으로 확인해주세요.</p>}
          {content && <p className="mt-5 whitespace-pre-line text-base leading-8 text-gray-700">{content.body}</p>}
        </article>}
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 px-4 py-2 safe-area-bottom">
          <p className="text-xs text-gray-500">화면이 안 보이면 원문을 열어주세요.</p>
          <a href={article.url} target="_blank" rel="noopener noreferrer" aria-label="기사 원문 새 탭에서 열기" className="flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-indigo-600">원문 열기<ExternalLink className="h-4 w-4" /></a>
        </footer>
      </div>
    </dialog>
  );
}
