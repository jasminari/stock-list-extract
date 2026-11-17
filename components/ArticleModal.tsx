"use client";

import { LoadingIcon } from "@/components/ui/loading-icon";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = "";
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader eyebrow="기사 미리보기">
          {article?.title || fallbackTitle || "기사"}
        </DialogHeader>

        <DialogBody className="text-[13px] leading-relaxed text-foreground/80 sm:text-sm">
          {loading && (
            <div role="status" className="flex flex-col items-center gap-3 py-10">
              <LoadingIcon className="h-20 w-20 text-primary" decorative />
              <span className="sr-only">기사를 불러오는 중…</span>
            </div>
          )}
          {error && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <p className="mb-1">{error}</p>
              <p className="text-xs">아래 원문 보기로 확인해주세요</p>
            </div>
          )}
          {article && <p className="whitespace-pre-line">{article.body}</p>}
        </DialogBody>

        <DialogFooter className="justify-between border-t border-border/60 py-3">
          <span className="truncate text-[11px] text-muted-foreground">
            {hostname}
          </span>
          <Button asChild variant="secondary" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              원문 보기 ↗
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
