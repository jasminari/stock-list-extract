"use client";

import { useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";

/**
 * 마지막 CTA — '체험하기'와 출시 알림 신청.
 *
 * 알림 신청은 아직 저장할 곳이 없다. 이메일을 받아 놓고 버리는 대신,
 * 접수 전이라는 사실을 그대로 알려준다.
 * TODO: /api/notify (이메일 저장) 붙이고 submit에서 호출하기.
 */
export default function ComingSoonCTA() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <section className="bg-white py-16 md:py-24">
      <Reveal>
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-14 text-center shadow-2xl shadow-indigo-600/25 md:px-16 md:py-20">
            <h2 className="break-keep text-3xl font-extrabold leading-tight tracking-tight text-white md:text-[46px]">
              앱은 준비 중,
              <br />
              시장은 오늘도 열려요
            </h2>
            <p className="mt-5 break-keep text-base text-indigo-100 md:text-lg">
              출시되면 가장 먼저 알려드릴게요. 그때까지는 웹에서 만나요.
            </p>

            <div className="mt-9">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-9 py-4 text-base font-extrabold text-indigo-600 transition-colors hover:bg-indigo-50 md:text-lg"
              >
                체험하기
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>

            <form
              id="notify"
              className="mx-auto mt-7 flex w-full max-w-[440px] scroll-mt-24 flex-col gap-2.5 rounded-2xl bg-white/15 p-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                setNotice(
                  "알림 신청 접수는 아직 준비 중이에요. 지금은 웹에서 바로 체험할 수 있어요."
                );
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소"
                aria-label="출시 알림 받을 이메일 주소"
                className="h-12 flex-1 rounded-xl bg-white px-4 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
              <button
                type="submit"
                className="h-12 whitespace-nowrap rounded-xl bg-gray-900 px-5 text-[15px] font-bold text-white transition-colors hover:bg-gray-800"
              >
                출시 알림 받기
              </button>
            </form>

            {notice && (
              <p className="mt-3 text-sm text-indigo-50" role="status">
                {notice}
              </p>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
