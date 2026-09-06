"use client";

import { useCallback, useEffect, useState } from "react";

/** 공시·시장 공부하기 탭에서 관심종목 별표 상태를 공유하는 훅 */
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
    (code: string, name: string) => {
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
        body: JSON.stringify(wasActive ? { code } : { code, name }),
      }).catch(() => {
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

  return { codes, toggle };
}
