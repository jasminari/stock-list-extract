import type { Metadata } from "next";
import NotifoldLanding from "@/components/landing/NotifoldLanding";

export const metadata: Metadata = {
  title: "StockExtract — 오늘 오른 종목, 왜 올랐는지까지",
  description: "장 마감 후 급등주와 상승이유를 한눈에. 근거 기사와 매일 퀴즈로 오늘의 시장을 공부하세요.",
};

export default function LandingPage() {
  return <NotifoldLanding />;
}
