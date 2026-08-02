"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** 등장 지연 (초) — 리스트에서 순차 등장시킬 때 */
  delay?: number;
  /** 시작 y 오프셋 (px) */
  y?: number;
  className?: string;
}

/** 스크롤해서 뷰포트에 들어올 때 아래에서 위로 부드럽게 나타나는 래퍼 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
