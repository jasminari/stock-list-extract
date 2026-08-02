import Link from "next/link";
import Reveal from "./Reveal";

export default function CTASection() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <Reveal>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 px-8 py-16 md:py-20 shadow-2xl shadow-blue-600/20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              내일 아침엔
              <br />
              이미 정리돼 있어요
            </h2>
            <p className="mt-5 text-lg text-blue-100">
              오늘 밤부터 시장이 저절로 공부돼요.
            </p>
            <div className="mt-9">
              <Link
                href="/login"
                className="inline-block px-9 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors text-lg"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
