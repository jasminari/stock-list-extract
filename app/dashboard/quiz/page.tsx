"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDateKorean } from "@/lib/date";
import { track } from "@/lib/analytics";
import type { QuizQuestion } from "@/lib/quiz";

interface AttemptRecord {
  quizDate: string;
  dataDate: string;
  score: number;
  total: number;
  completedAt: string;
}

interface QuizPayload {
  quizDate: string;
  dataDate: string | null;
  questions: QuizQuestion[];
  attempt: AttemptRecord | null;
  streak: number;
  history: AttemptRecord[];
  persisted: boolean;
}

type Stage = "start" | "playing" | "done";

export default function QuizPage() {
  const [data, setData] = useState<QuizPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stage, setStage] = useState<Stage>("start");
  const [practice, setPractice] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(
    null
  );
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((payload: QuizPayload & { error?: string }) => {
        if (payload.error) {
          setError(payload.error);
          return;
        }
        setData(payload);
        setStreak(payload.streak);
        if (payload.attempt) {
          setStage("done");
          setResult({ score: payload.attempt.score, total: payload.attempt.total });
        }
      })
      .catch(() => setError("퀴즈를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, []);

  const questions = data?.questions ?? [];
  const current = questions[index];
  const total = questions.length;
  const correctSoFar = useMemo(
    () => answers.filter((a, i) => a === questions[i]?.answerIndex).length,
    [answers, questions]
  );

  const start = useCallback(
    (isPractice: boolean) => {
      setPractice(isPractice);
      setStage("playing");
      setIndex(0);
      setSelected(null);
      setChecked(false);
      setAnswers([]);
      setResult(null);
      track("Daily Quiz Started", {
        quizDate: data?.quizDate,
        practice: isPractice,
        questionCount: total,
      });
    },
    [data?.quizDate, total]
  );

  const finish = useCallback(
    async (finalAnswers: number[]) => {
      const localScore = finalAnswers.filter(
        (a, i) => a === questions[i]?.answerIndex
      ).length;

      if (practice) {
        setResult({ score: localScore, total });
        setStage("done");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: finalAnswers }),
        });
        const payload = await res.json();
        if (payload.error) {
          setResult({ score: localScore, total });
        } else {
          setResult({ score: payload.score, total: payload.total });
          setStreak(payload.streak);
        }
      } catch {
        setResult({ score: localScore, total });
      } finally {
        setSubmitting(false);
        setStage("done");
        track("Daily Quiz Completed", {
          quizDate: data?.quizDate,
          score: localScore,
          total,
        });
      }
    },
    [practice, questions, total, data?.quizDate]
  );

  const handleCheck = useCallback(() => {
    if (selected === null || !current) return;
    setChecked(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = selected;
      return next;
    });
  }, [selected, current, index]);

  const handleNext = useCallback(() => {
    const next = [...answers];
    next[index] = selected ?? -1;

    if (index + 1 >= total) {
      finish(next);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  }, [answers, index, selected, total, finish]);

  // 숫자키로 보기 선택, Enter로 확인/다음 — 반복 학습 속도를 위해
  useEffect(() => {
    if (stage !== "playing" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (checked) handleNext();
        else handleCheck();
        return;
      }
      const n = Number(e.key);
      if (!checked && n >= 1 && n <= current.choices.length) setSelected(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, current, checked, handleCheck, handleNext]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 mb-4">퀴즈를 불러오지 못했습니다</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span>내 검색</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">매일 퀴즈</span>
        </div>

        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          {stage === "playing" ? (
            <>
              <div className="flex-1 flex gap-1.5 max-w-md">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-full transition-colors ${
                      i < index || (i === index && checked)
                        ? answers[i] === questions[i].answerIndex
                          ? "bg-emerald-500"
                          : "bg-rose-400"
                        : i === index
                          ? "bg-emerald-200"
                          : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                {index + 1}/{total}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">
              {formatDateKorean(data.quizDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {stage === "start" && (
            <StartCard
              data={data}
              onStart={() => start(false)}
            />
          )}

          {stage === "playing" && current && (
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18 }}
              >
                <QuestionCard
                  question={current}
                  selected={selected}
                  checked={checked}
                  onSelect={setSelected}
                />
              </motion.div>
            </AnimatePresence>
          )}

          {stage === "done" && result && (
            <ResultCard
              score={result.score}
              total={result.total}
              streak={streak}
              questions={questions}
              answers={answers}
              reviewed={answers.length > 0}
              practice={practice}
              alreadyDone={!!data.attempt && !practice}
              onPractice={() => start(true)}
            />
          )}
        </div>
      </div>

      {/* 하단 확인/다음 바 */}
      {stage === "playing" && current && (
        <div
          className={`flex-shrink-0 border-t px-4 md:px-6 py-3 md:py-4 transition-colors ${
            checked
              ? selected === current.answerIndex
                ? "bg-emerald-50 border-emerald-100"
                : "bg-rose-50 border-rose-100"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="max-w-2xl mx-auto flex flex-col md:flex-row md:items-center gap-3">
            {checked && (
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold mb-1 ${
                    selected === current.answerIndex
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {selected === current.answerIndex
                    ? "정답이에요!"
                    : `아쉬워요 · 정답은 ${current.choices[current.answerIndex]}`}
                </div>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                  {current.explanation}
                </p>
              </div>
            )}
            <button
              onClick={checked ? handleNext : handleCheck}
              disabled={selected === null || submitting}
              className={`px-6 py-3 rounded-xl text-sm font-bold text-white transition-colors flex-shrink-0 md:w-40 ${
                selected === null
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : checked && selected !== current.answerIndex
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {submitting
                ? "채점 중..."
                : checked
                  ? index + 1 >= total
                    ? "결과 보기"
                    : "계속하기"
                  : "확인"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0 ${
        streak > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-400"
      }`}
      title="연속 학습일"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c.5 3.5-1.5 4.5-3 6.5C7.3 10.7 6 12.4 6 14.5A6 6 0 0018 15c0-3.5-2.5-5-3.5-7.5-.7-1.7-1-3.5-2.5-5.5zm0 17a3 3 0 01-3-3c0-1.4 1-2.4 1.8-3.4.6-.8 1.2-1.6 1.2-2.6 1 1.3 2 2 2.6 3 .4.7.4 1.4.4 2a3 3 0 01-3 4z" />
      </svg>
      <span className="text-sm font-bold tabular-nums">{streak}</span>
      <span className="text-xs">일</span>
    </div>
  );
}

function StartCard({
  data,
  onStart,
}: {
  data: QuizPayload;
  onStart: () => void;
}) {
  const best = data.history.filter((h) => h.score === h.total).length;

  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">오늘의 퀴즈 5문제</h1>
      <p className="text-sm text-gray-500 mb-1">
        {data.dataDate
          ? `${formatDateKorean(data.dataDate)} 시장 데이터로 만든 문제예요`
          : "시장 데이터가 아직 없어 개념 문제로 준비했어요"}
      </p>
      <p className="text-xs text-gray-400 mb-8">하루 한 번, 3분이면 충분합니다</p>

      <button
        onClick={onStart}
        className="w-full md:w-64 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-colors shadow-sm"
      >
        시작하기
      </button>

      {data.history.length > 0 && (
        <div className="mt-10 text-left">
          <div className="text-xs font-medium text-gray-400 mb-3">
            최근 기록 · 만점 {best}회
          </div>
          <div className="space-y-1.5">
            {data.history.map((h) => (
              <div
                key={h.quizDate}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50"
              >
                <span className="text-sm text-gray-600">
                  {formatDateKorean(h.quizDate)}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    h.score === h.total ? "text-emerald-600" : "text-gray-500"
                  }`}
                >
                  {h.score}/{h.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  checked,
  onSelect,
}: {
  question: QuizQuestion;
  selected: number | null;
  checked: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <div>
      <div className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 text-[11px] font-medium text-gray-500 mb-3">
        {question.tag}
      </div>
      <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-snug mb-4">
        {question.prompt}
      </h2>

      {question.passage && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-gray-50 border-l-4 border-emerald-200 text-sm text-gray-600 leading-relaxed">
          {question.passage}
        </div>
      )}

      <div className="space-y-2.5">
        {question.choices.map((choice, i) => {
          const isSelected = selected === i;
          const isAnswer = i === question.answerIndex;

          let style = "border-gray-200 bg-white hover:bg-gray-50 text-gray-700";
          if (checked && isAnswer)
            style = "border-emerald-500 bg-emerald-50 text-emerald-800";
          else if (checked && isSelected)
            style = "border-rose-400 bg-rose-50 text-rose-800";
          else if (isSelected)
            style = "border-emerald-500 bg-emerald-50 text-emerald-800";

          return (
            <button
              key={`${choice}-${i}`}
              onClick={() => !checked && onSelect(i)}
              disabled={checked}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-b-4 text-left text-sm md:text-base font-medium transition-colors ${style} ${
                checked ? "cursor-default" : ""
              }`}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isSelected || (checked && isAnswer)
                    ? "bg-white/70 text-current"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1">{choice}</span>
              {checked && isAnswer && (
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {checked && isSelected && !isAnswer && (
                <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({
  score,
  total,
  streak,
  questions,
  answers,
  reviewed,
  practice,
  alreadyDone,
  onPractice,
}: {
  score: number;
  total: number;
  streak: number;
  questions: QuizQuestion[];
  answers: number[];
  reviewed: boolean;
  practice: boolean;
  alreadyDone: boolean;
  onPractice: () => void;
}) {
  const perfect = score === total;
  const message = perfect
    ? "완벽해요! 오늘 시장은 다 파악했네요"
    : score >= total - 1
      ? "거의 다 맞혔어요"
      : score >= total / 2
        ? "괜찮아요, 해설을 한 번 더 읽어보세요"
        : "오늘 배운 걸 내일 다시 확인해봐요";

  return (
    <div className="py-4">
      <div className="text-center mb-8">
        <div
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center mx-auto mb-4 ${
            perfect ? "bg-emerald-50" : "bg-gray-100"
          }`}
        >
          <span
            className={`text-3xl font-bold tabular-nums ${
              perfect ? "text-emerald-600" : "text-gray-700"
            }`}
          >
            {score}
          </span>
          <span className="text-xs text-gray-400">/ {total}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1.5">{message}</h1>
        {practice ? (
          <p className="text-sm text-gray-400">연습 모드 · 기록에는 반영되지 않아요</p>
        ) : (
          <p className="text-sm text-gray-500">
            {streak > 0 ? `${streak}일 연속 학습 중이에요` : "내일도 이어가볼까요?"}
          </p>
        )}
      </div>

      {reviewed ? (
        <div className="space-y-3">
          <div className="text-xs font-medium text-gray-400">문제 다시 보기</div>
          {questions.map((q, i) => {
            const mine = answers[i];
            const ok = mine === q.answerIndex;
            return (
              <div
                key={q.id}
                className={`px-4 py-3.5 rounded-2xl border ${
                  ok ? "border-gray-200 bg-white" : "border-rose-100 bg-rose-50/40"
                }`}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      ok ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d={ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}
                      />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">
                      {q.prompt}
                    </p>
                    <p className="text-sm text-emerald-700 mt-1">
                      정답 · {q.choices[q.answerIndex]}
                    </p>
                    {!ok && mine >= 0 && mine !== undefined && (
                      <p className="text-xs text-rose-500 mt-0.5">
                        내 답 · {q.choices[mine]}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed pl-8">
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 mb-6">
          오늘 퀴즈는 이미 완료했어요. 내일 새로운 문제로 만나요!
        </p>
      )}

      {(alreadyDone || practice) && (
        <button
          onClick={onPractice}
          className="w-full mt-8 py-3.5 rounded-2xl border-2 border-b-4 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          다시 풀어보기 (연습)
        </button>
      )}
    </div>
  );
}
