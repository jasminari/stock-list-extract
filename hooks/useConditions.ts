"use client";

import { useState, useCallback, useEffect } from "react";
import type { Condition } from "@/lib/types";

export function useConditions() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [selectedSeq, setSelectedSeq] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conditions");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConditions(data.conditions);
      if (data.conditions.length > 0) {
        setSelectedSeq(data.conditions[0].seq);
        setSelectedName(data.conditions[0].name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const select = useCallback((seq: string, name: string) => {
    setSelectedSeq(seq);
    setSelectedName(name);
  }, []);

  return {
    conditions,
    selectedSeq,
    selectedName,
    loading,
    error,
    load,
    select,
  };
}
