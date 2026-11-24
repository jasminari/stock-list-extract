"use client";

import { useCallback, useEffect, useState } from "react";

/** 공시·홈 탭에서 관심종목 별표 상태를 공유하는 훅 */
export function useWatchlist() {
  const [codes, setCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setCodes(new Set((data.items ?? []).map((i: { code: string }) => i.code)));
        }
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(
    (code: string, name: string, listDate?: string) => {
      const wasActive = codes.has(code);
      setCodes((prev) => {
        const next = new Set(prev);
        if (wasActive) next.delete(code);
        else next.add(code);
        return next;
      });

      fetch("/api/watchlist", {
        method: wasActive ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wasActive ? { code } : { code, name, listDate }),
      })
        .then((r) => {
          if (!r.ok) throw new Error();
        })
        .catch(() => {
        // 실패하면 되돌린다
        setCodes((prev) => {
          const reverted = new Set(prev);
          if (wasActive) reverted.add(code);
          else reverted.delete(code);
          return reverted;
        });
      });
    },
    [codes]
  );

  /** 담기만 한다. 서버 응답까지 기다려 결과를 알려 준다 */
  const add = useCallback(
    async (code: string, name: string, listDate?: string): Promise<"added" | "already" | "failed"> => {
      if (codes.has(code)) return "already";
      setCodes((prev) => new Set(prev).add(code));
      try {
        const r = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name, listDate }),
        });
        if (!r.ok) throw new Error();
        return "added";
      } catch {
        setCodes((prev) => {
          const reverted = new Set(prev);
          reverted.delete(code);
          return reverted;
        });
        return "failed";
      }
    },
    [codes]
  );

  return { codes, toggle, add };
}
