"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type SheetSnap = "peek" | "half" | "full";

interface BottomSheetProps {
  /** 시트가 놓인 영역(가장 가까운 relative 부모) 안에서 차지할 높이 단계 */
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** 가장 낮게 내렸을 때 보이는 높이(px) */
  peekHeight?: number;
  /** 손잡이 아래에 항상 보이는 머리 부분. 이 부분을 잡고 끌 수 있다 */
  header: ReactNode;
  label: string;
  children: ReactNode;
}

const TOP_GAP = 12;

/**
 * 화면 아래에서 올라오는 시트. 손잡이나 머리 부분을 위아래로 끌면
 * 살짝 보임 → 절반 → 전체 세 단계로 멈춘다. 뒤 화면은 계속 쓸 수 있다.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  peekHeight = 124,
  header,
  label,
  children,
}: BottomSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [areaHeight, setAreaHeight] = useState(0);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);

  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const measure = () => setAreaHeight(parent.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const heightOf = useCallback(
    (s: SheetSnap) => {
      const full = Math.max(peekHeight, areaHeight - TOP_GAP);
      if (s === "full") return full;
      if (s === "half") return Math.max(peekHeight, Math.min(full, Math.round(areaHeight * 0.55)));
      return peekHeight;
    },
    [areaHeight, peekHeight]
  );

  const height = dragHeight ?? heightOf(snap);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    drag.current = { startY: e.clientY, startHeight: heightOf(snap), moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    setDragHeight(Math.max(peekHeight, Math.min(heightOf("full"), d.startHeight + dy)));
  };
  const onPointerEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // 끌지 않고 누르기만 하면 한 단계씩 올리고, 다 올라와 있으면 내린다
      onSnapChange(snap === "peek" ? "half" : snap === "half" ? "full" : "peek");
    } else if (dragHeight !== null) {
      const order: SheetSnap[] = ["peek", "half", "full"];
      const nearest = order.reduce((best, s) =>
        Math.abs(heightOf(s) - dragHeight) < Math.abs(heightOf(best) - dragHeight) ? s : best
      );
      onSnapChange(nearest);
    }
    setDragHeight(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") onSnapChange(snap === "peek" ? "half" : "full");
    else if (e.key === "ArrowDown") onSnapChange(snap === "full" ? "half" : "peek");
    else if (e.key === "Escape") onSnapChange("peek");
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={label}
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-border bg-background shadow-[0_-8px_30px_rgba(15,23,42,0.12)] md:inset-x-auto md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:border-x"
      style={{
        height,
        transition: dragHeight === null ? "height 260ms cubic-bezier(0.32, 0.72, 0, 1)" : "none",
        visibility: areaHeight ? "visible" : "hidden",
      }}
    >
      <div
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${label} 높이 조절`}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={snap === "peek" ? 0 : snap === "half" ? 1 : 2}
          aria-valuetext={snap === "peek" ? "접힘" : snap === "half" ? "절반" : "전체"}
          onKeyDown={onKeyDown}
          className="flex h-6 items-center justify-center rounded-t-3xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border" />
        </div>
        {header}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
