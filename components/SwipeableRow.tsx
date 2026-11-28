"use client";

import { useRef, useState, type ReactNode } from "react";

interface SwipeableRowProps {
  children: ReactNode;
  /** 오른쪽으로 밀었을 때 (관심종목에 담기) */
  onSwipeRight?: () => void;
  /** 왼쪽으로 밀었을 때 (버리기) */
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  /** 오른쪽으로 밀어도 이미 담긴 상태면 안내 문구를 바꾼다 */
  rightDone?: boolean;
  className?: string;
}

/** 손가락이 이만큼 가로로 움직여야 스와이프로 본다. 그 전에 세로로 움직이면 스크롤로 넘긴다 */
const LOCK_DISTANCE = 10;
/** 행 너비 대비 이 비율을 넘겨서 놓으면 동작을 실행한다 */
const COMMIT_RATIO = 0.3;
const COMMIT_MIN_PX = 80;

/**
 * 좌우로 밀어 동작을 실행하는 목록 행.
 * 세로 스크롤은 브라우저에 맡기고(touch-action: pan-y), 가로 움직임만 직접 처리한다.
 */
export default function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "관심종목",
  leftLabel = "버리기",
  rightDone = false,
  className = "",
}: SwipeableRowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    mode: "pending" | "drag" | "scroll";
    armed: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dx, setDxState] = useState(0);
  // 손을 뗄 때는 마지막 렌더 값이 아니라 실제 마지막 위치로 판단한다
  const dxRef = useRef(0);
  const setDx = (value: number) => {
    dxRef.current = value;
    setDxState(value);
  };
  const [animating, setAnimating] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const enabled = !!(onSwipeLeft || onSwipeRight);
  const width = () => rootRef.current?.offsetWidth ?? 360;
  const threshold = () => Math.max(COMMIT_MIN_PX, width() * COMMIT_RATIO);

  const settle = (to: number, after?: () => void) => {
    setAnimating(true);
    setDx(to);
    window.setTimeout(() => {
      setAnimating(false);
      after?.();
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || leaving || (e.pointerType === "mouse" && e.button !== 0)) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: "pending", armed: false };
    suppressClick.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId || g.mode === "scroll") return;
    const moveX = e.clientX - g.x;
    const moveY = e.clientY - g.y;

    if (g.mode === "pending") {
      if (Math.abs(moveY) > LOCK_DISTANCE && Math.abs(moveY) > Math.abs(moveX)) {
        g.mode = "scroll";
        return;
      }
      if (Math.abs(moveX) < LOCK_DISTANCE) return;
      g.mode = "drag";
      suppressClick.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    // 동작이 없는 방향으로는 조금만 끌리게 한다
    let next = moveX;
    if ((next > 0 && !onSwipeRight) || (next < 0 && !onSwipeLeft)) next = next * 0.15;
    setDx(next);

    const armed = Math.abs(next) >= threshold();
    if (armed !== g.armed) {
      g.armed = armed;
      if (armed) navigator.vibrate?.(8);
    }
  };

  const finish = (e: React.PointerEvent, cancelled = false) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.mode !== "drag") return;

    const dx = dxRef.current;
    // 어느 쪽이든 넘기면 화면 밖으로 밀어낸 뒤 동작을 실행한다 (목록에서 빼는 건 부모가 한다)
    if (!cancelled && dx <= -threshold() && onSwipeLeft) {
      setLeaving(true);
      settle(-width(), onSwipeLeft);
    } else if (!cancelled && dx >= threshold() && onSwipeRight) {
      setLeaving(true);
      settle(width(), onSwipeRight);
    } else {
      settle(0);
    }
  };

  const progress = Math.min(1, Math.abs(dx) / threshold());
  const armed = progress >= 1;

  return (
    <div ref={rootRef} className={`relative overflow-hidden ${className}`}>
      {enabled && dx !== 0 && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center px-6 text-sm font-semibold transition-colors ${
            dx > 0
              ? `justify-start ${armed ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`
              : `justify-end ${armed ? "bg-destructive text-white" : "bg-destructive/15 text-destructive"}`
          }`}
        >
          <span
            className="flex items-center gap-1.5"
            style={{ opacity: 0.35 + progress * 0.65, transform: `scale(${0.85 + progress * 0.15})` }}
          >
            {dx > 0 ? (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill={armed ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.39a.56.56 0 01-.84.61l-4.73-2.89a.56.56 0 00-.59 0l-4.73 2.89a.56.56 0 01-.84-.61l1.28-5.39a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.47-.35z" />
                </svg>
                {rightDone ? "이미 담았어요" : rightLabel}
              </>
            ) : (
              <>
                {leftLabel}
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.1 1.02.16M19.23 5.79L18.16 19.67A2.25 2.25 0 0115.92 21.75H8.08a2.25 2.25 0 01-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 00-3.48-.4m-12 .56c.34-.06.68-.11 1.02-.16m0 0a48.1 48.1 0 013.48-.4m7.5 0v-.92c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 00-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.92m7.5 0a48.67 48.67 0 00-7.5 0" />
                </svg>
              </>
            )}
          </span>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e)}
        onPointerCancel={(e) => finish(e, true)}
        onClickCapture={(e) => {
          // 밀다가 놓은 손가락이 종목명 버튼을 누른 것으로 처리되지 않게 막는다
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
        className={`relative bg-background ${animating ? "transition-transform duration-200 ease-out" : ""}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: enabled ? "pan-y" : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
