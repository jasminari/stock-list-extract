"use client";

import { useState, useCallback } from "react";
import type { ResultMeta } from "@/lib/types";

export function useResults() {
  const [results, setResults] = useState<ResultMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      if (!data.error) setResults(data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, load };
}
