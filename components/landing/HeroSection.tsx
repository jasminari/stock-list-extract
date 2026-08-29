"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import TickerMarquee from "./TickerMarquee";

export default function HeroSection() {
  return (
    <section className="relative overflow-x-clip bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-12 md:pt-28 md:pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI가 상승이유까지 정리
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                오늘 오른 종목,
                <br />
                <span className="text-emerald-600">왜 올랐는지</span>
                <br />
                까지 자동으로.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-500 leading-relaxed">
                매일 장 마감 후 급등주를 수집하고,{" "}
                <br className="hidden sm:block" />
                특징주 뉴스를 찾아 상승이유를 정리해 드려요.
              </p>
            </motion.div>

            <motion.div
              className="mt-8 flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href="/login"
                className="px-7 py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                무료로 시작하기
              </Link>
              <Link
                href="/dashboard/history"
                className="px-7 py-3.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                둘러보기
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="min-w-0"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroPreview />
          </motion.div>
        </div>
      </div>

      {/* KOSPI 종목 티커 */}
      <div className="pb-14 md:pb-20">
        <TickerMarquee />
      </div>
    </section>
  );
}

const ROWS = [
  {
    name: "두산에너빌리티",
    keyword: "체코 원전",
    amount: "9,019억",
    rate: "+7.62%",
    reason: "체코 원전 계약금지 가처분 취소 판결에 급등",
    hot: true,
  },
  {
    name: "한전기술",
    keyword: "체코 계약",
    amount: "2,048억",
    rate: "+19.8%",
    reason: "25조 규모 체코 신규 원전 계약 체결 소식",
    hot: true,
  },
  {
    name: "삼성전기",
    keyword: "애플 유리기판",
    amount: "1,246억",
    rate: "+8.46%",
    reason: "애플과 유리기판 공급 협의 진행 소식",
    hot: false,
  },
];

function HeroPreview() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-gray-400">시장 공부하기</span>
      </div>

      <div className="space-y-3">
        {ROWS.map((row, i) => (
          <motion.div
            key={i}
            className="rounded-xl border border-gray-100 p-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-900 text-sm truncate">
                {row.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                    row.hot
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-500"
                  }`}
                >
                  {row.amount}
                </span>
                <span className="text-sm font-bold text-red-500 whitespace-nowrap">
                  {row.rate}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2 min-w-0">
              <span className="shrink-0 text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">
                {row.keyword}
              </span>
              <p className="text-xs text-gray-500 leading-snug min-w-0">
                {row.reason}{" "}
                <span className="text-emerald-400">🔗</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
