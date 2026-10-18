/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * 대성전 대문이 열리며 안으로 들어가는 스크롤 인트로.
 *
 * 레이어 구성 (뒤 → 앞)
 *   1) far      : 대성전 원경 사진. 스크롤 0~50%에 대문 위치를 향해 줌인한다.
 *   2) gate     : 대문 클로즈업 사진(문틀). 45% 지점에서 원경과 크로스페이드된다.
 *      2-1) opening  : 문틀에 뚫린 구멍. 안쪽에 내부 사진 + 빛이 들어 있다.
 *      2-2) doorL/R  : 문틀에서 잘라낸 좌/우 문짝. Y축 3D 회전으로 열린다.
 *
 * 좌표는 원본 문 클로즈업(604x340px)에서 잰 값을 %로 환산한 것이라
 * 이미지를 교체하면 GEO 상수만 다시 재면 된다.
 */
const GEO = {
  frameRatio: "604 / 340",
  // 문이 뚫려 있는 영역
  opening: { left: "25.17%", top: "6.47%", width: "48.51%", height: "87.06%" },
  // 좌/우 문짝 (합치면 opening과 정확히 겹친다)
  doorLeft: { left: "25.17%", top: "6.47%", width: "23.34%", height: "87.06%" },
  doorRight: { left: "48.51%", top: "6.47%", width: "25.17%", height: "87.06%" },
  // 원경 사진(1600x1066) 안에서 대문이 있는 지점 — 줌인의 중심
  farRatio: "1600 / 1066",
  farOrigin: "57% 64%",
};

// SSR에서는 useLayoutEffect가 경고를 내므로 서버에서만 useEffect로 대체한다
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function GateIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const [far] = q(".gi-far");
      const [gate] = q(".gi-gate");
      const doorL = q(".gi-door-left");
      const doorR = q(".gi-door-right");

      // 스테이지 중앙 정렬 — transform을 GSAP이 소유하므로 CSS 클래스 대신 여기서 잡는다
      gsap.set([...q(".gi-gate-stage"), ...q(".gi-far")], { xPercent: -50, yPercent: -50 });

      // 모션 최소화를 켠 사용자에게는 핀/애니메이션 없이 "문이 열린 마지막 장면"만 보여준다
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(far, { opacity: 0 });
        gsap.set(gate, { opacity: 1 });
        gsap.set(doorL, { rotateY: -74 });
        gsap.set(doorR, { rotateY: 74 });
        gsap.set(q(".gi-hero-copy"), { opacity: 0 });
        gsap.set(q(".gi-enter-copy"), { opacity: 1, y: 0 });
        gsap.set(q(".gi-glow"), { opacity: 0.45 });
        gsap.set(q(".gi-gate-stage"), { scale: 2.3 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          // 문이 다 열릴 때까지 화면을 붙잡아 둔다
          end: () => "+=" + window.innerHeight * 3.2,
          pin: stageRef.current,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // ── 0% ~ 50% : 대문을 향해 카메라 줌인
      // 줌인하면서 대문이 화면 정중앙으로 오도록 살짝 밀어준다 (클로즈업 사진과 자리를 맞추기 위해)
      tl.fromTo(
        far,
        { scale: 1, xPercent: -50, yPercent: -50 },
        { scale: 4.6, xPercent: -57, yPercent: -64, duration: 0.5 },
        0
      );
      tl.to(q(".gi-hero-copy"), { opacity: 0, y: -40, duration: 0.14 }, 0);
      tl.to(q(".gi-vignette"), { opacity: 0.85, duration: 0.5 }, 0);

      // ── 35% ~ 50% : 원경 → 대문 클로즈업 크로스페이드
      tl.fromTo(gate, { opacity: 0, scale: 1.14 }, { opacity: 1, scale: 1, duration: 0.15 }, 0.35);
      tl.to(far, { opacity: 0, duration: 0.06 }, 0.46);

      // ── 45% ~ 55% : 문틈으로 빛이 새어 나온다
      tl.fromTo(
        q(".gi-seam"),
        { opacity: 0, scaleX: 0.4 },
        { opacity: 1, scaleX: 1, duration: 0.1 },
        0.45
      );

      // ── 50% ~ 80% : 좌/우 문짝이 Y축으로 열린다
      tl.fromTo(doorL, { rotateY: 0 }, { rotateY: -74, duration: 0.3 }, 0.5);
      tl.fromTo(doorR, { rotateY: 0 }, { rotateY: 74, duration: 0.3 }, 0.5);
      // 열릴수록 문짝 앞면이 광원에서 멀어지므로 그늘을 덧씌운다
      tl.to(q(".gi-door-shade"), { opacity: 0.55, duration: 0.3 }, 0.5);
      tl.to(q(".gi-seam"), { opacity: 0, duration: 0.08 }, 0.56);

      // ── 72% ~ 100% : 빛과 함께 내부가 드러나고 카메라가 한 걸음 더 들어간다
      tl.fromTo(q(".gi-glow"), { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.72);
      tl.to(q(".gi-glow"), { opacity: 0.35, duration: 0.14 }, 0.86);
      tl.fromTo(q(".gi-interior"), { scale: 1.22 }, { scale: 1, duration: 0.28 }, 0.72);
      // 문 사이로 카메라가 전진 — 문짝과 문틀이 화면 밖으로 밀려나고 내부만 남는다
      tl.fromTo(q(".gi-gate-stage"), { scale: 1 }, { scale: 2.3, duration: 0.2 }, 0.8);
      tl.fromTo(
        q(".gi-enter-copy"),
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.16 },
        0.84
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative bg-[#1a0f0c]">
      <div
        ref={stageRef}
        className="relative h-screen w-full overflow-hidden bg-[#1a0f0c]"
      >
        {/* Step 1~2 — 대성전 원경 */}
        <div
          className="gi-far absolute left-1/2 top-1/2 will-change-transform"
          style={{
            width: "max(100vw, 150.1vh)",
            aspectRatio: GEO.farRatio,
            transformOrigin: GEO.farOrigin,
          }}
        >
          <img
            src="/intro/gate-far.jpg"
            alt="대성전 전경"
            className="h-full w-full"
          />
        </div>

        {/* Step 3~4 — 대문 클로즈업 + 3D로 열리는 문짝 */}
        <div className="gi-gate absolute inset-0 opacity-0 will-change-transform">
          <div
            className="gi-gate-stage absolute left-1/2 top-1/2 will-change-transform"
            style={{
              width: "max(100vw, 177.65vh)",
              aspectRatio: GEO.frameRatio,
              perspective: "1500px",
              perspectiveOrigin: "50% 48%",
              // 확대 기준점 = 문 구멍의 한가운데
              transformOrigin: "49.4% 50%",
            }}
          >
            {/* 문틀 (기둥과 벽) */}
            <img
              src="/intro/gate-frame.jpg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            />

            {/* 문 안쪽 — 내부 전경과 쏟아지는 빛 */}
            <div className="absolute overflow-hidden bg-black" style={GEO.opening}>
              <img
                src="/intro/gate-interior.jpg"
                alt="문 안쪽 내부 전경"
                className="gi-interior h-full w-full object-cover will-change-transform"
              />
              <div
                className="gi-glow pointer-events-none absolute inset-0 opacity-0"
                style={{
                  background:
                    "radial-gradient(60% 50% at 50% 45%, rgba(255,244,214,0.92) 0%, rgba(255,231,181,0.45) 35%, rgba(255,214,150,0) 72%)",
                }}
              />
            </div>

            {/* 문틈으로 새어 나오는 빛 */}
            <div
              className="gi-seam pointer-events-none absolute opacity-0"
              style={{
                left: "47.9%",
                top: "6.47%",
                width: "1.2%",
                height: "87.06%",
                background:
                  "linear-gradient(90deg, rgba(255,240,205,0) 0%, rgba(255,246,224,0.95) 50%, rgba(255,240,205,0) 100%)",
                filter: "blur(6px)",
              }}
            />

            {/* 왼쪽 문짝 — 왼쪽 모서리를 축으로 열린다 */}
            <div
              className="gi-door-left absolute will-change-transform"
              style={{
                ...GEO.doorLeft,
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
              }}
            >
              <img
                src="/intro/door-left.jpg"
                alt=""
                aria-hidden="true"
                className="h-full w-full"
                style={{ objectFit: "fill" }}
              />
              <div
                className="gi-door-shade pointer-events-none absolute inset-0 opacity-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)",
                }}
              />
            </div>

            {/* 오른쪽 문짝 — 오른쪽 모서리를 축으로 열린다 */}
            <div
              className="gi-door-right absolute will-change-transform"
              style={{
                ...GEO.doorRight,
                transformOrigin: "right center",
                transformStyle: "preserve-3d",
              }}
            >
              <img
                src="/intro/door-right.jpg"
                alt=""
                aria-hidden="true"
                className="h-full w-full"
                style={{ objectFit: "fill" }}
              />
              <div
                className="gi-door-shade pointer-events-none absolute inset-0 opacity-0"
                style={{
                  background:
                    "linear-gradient(270deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* 화면 가장자리 어둠 — 줌인할수록 짙어지며 시선을 문으로 모은다 */}
        <div
          className="gi-vignette pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(75% 60% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)",
          }}
        />

        {/* Step 1 카피 */}
        <div className="gi-hero-copy pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <p className="relative mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            StockExtract
          </p>
          <h1 className="relative break-keep text-4xl font-bold leading-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:text-6xl">
            배움의 문 앞에 서다
          </h1>
          <p className="relative mt-5 break-keep text-base text-white/80 md:text-lg">
            오늘 시장이 왜 움직였는지, 문 안에 정리해 두었어요.
          </p>
          <div className="relative mt-12 flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm text-white/85 backdrop-blur-sm">
            <span className="relative flex h-4 w-2.5 items-start justify-center rounded-full border border-white/70">
              <span className="mt-0.5 h-1 w-0.5 animate-bounce rounded-full bg-white/90" />
            </span>
            스크롤을 내려 들어가기
          </div>
        </div>

        {/* Step 4 카피 */}
        <div className="gi-enter-copy pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-16 text-center opacity-0 md:pb-20">
          <h2 className="break-keep text-3xl font-bold leading-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.7)] md:text-5xl">
            오늘의 시장 공부, 여기서 시작해요
          </h2>
          <p className="mt-4 max-w-xl break-keep text-base text-white/80 md:text-lg">
            장 마감 후 급등주와 상승이유가 매일 정리되어 기다립니다.
          </p>
          <a
            href="/login"
            className="pointer-events-auto mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
          >
            체험하기
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
