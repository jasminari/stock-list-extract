"use client";

import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import motif from "./loading-icon-data.json";

interface LoadingIconProps {
  className?: string;
  label?: string;
  /** Use inside a parent status message or a button that already has a label. */
  decorative?: boolean;
}

/** Arch / motion 15: the selected Lottie contours and double pulse, in SVG. */
export function LoadingIcon({
  className,
  label = "불러오는 중",
  decorative = false,
}: LoadingIconProps) {
  const clipId = `loading-arch-${useId().replace(/:/g, "")}`;

  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center", className)}
      role={decorative ? undefined : "status"}
      aria-hidden={decorative ? true : undefined}
    >
      <svg
        className="motif-loading h-full w-full"
        viewBox={motif.viewBox}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={motif.outline} clipRule="evenodd" />
          </clipPath>
        </defs>
        <path className="motif-loading-base" d={motif.outline} fill="currentColor" fillRule="evenodd" opacity="0.26" />
        <g className="motif-loading-wave" clipPath={`url(#${clipId})`}>
          {motif.strokes.map((stroke, index) => (
            <path
              key={index}
              className="motif-loading-stroke"
              d={stroke.d}
              stroke="currentColor"
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animationDelay: `${stroke.delay}s` } as CSSProperties}
            />
          ))}
        </g>
      </svg>
      {!decorative && <span className="sr-only">{label}</span>}
    </span>
  );
}
