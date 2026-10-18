"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDateKorean } from "@/lib/date";
import { track } from "@/lib/analytics";
import QuizArticleSheet from "@/components/QuizArticleSheet";
import { CheckCircle2, ChevronRight, CircleHelp, Newspaper, XCircle } from "lucide-react";
import type { QuizQuestion } from "@/lib/quiz";
import { LoadingIcon } from "@/components/ui/loading-icon";

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
  const [articleOpen, setArticleOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSkip = useCallback(() => {
    if (!current || checked) return;
    setSelected(-1);
    setChecked(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = -1;
      return next;
    });
  }, [current, checked, index]);

  useEffect(() => {
    if (checked) feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    else scrollRef.current?.scrollTo({ top: 0 });
  }, [checked, index, stage]);

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
    if (stage !== "playing" || !current || articleOpen || submitting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, select, dialog")) return;
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
  }, [stage, current, checked, handleCheck, handleNext, articleOpen, submitting]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingIcon className="h-20 w-20 text-indigo-600" label="퀴즈 불러오는 중" />
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
        <div className="flex items-center gap-3">
          {stage !== "playing" && <StreakBadge streak={streak} />}
          {stage === "playing" ? (
            <>
              <div className="flex-1 flex gap-1.5 max-w-md">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-full transition-colors ${
                      i < index || (i === index && checked)
                        ? answers[i] === questions[i].answerIndex
                          ? "bg-indigo-500"
                          : "bg-rose-400"
                        : i === index
                          ? "bg-indigo-200"
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

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 md:px-6 py-6">
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
                {!checked && (
                  <button onClick={handleSkip} className="mt-4 min-h-11 flex items-center gap-2 mx-auto px-4 text-sm text-gray-500 hover:text-indigo-600">
                    <CircleHelp className="w-4 h-4" aria-hidden="true" />모르겠어요
                  </button>
                )}
                {checked && (
                  <div ref={feedbackRef} className={`mt-6 rounded-2xl p-4 md:p-5 ${selected === current.answerIndex ? "bg-emerald-50" : selected === -1 ? "bg-indigo-50" : "bg-rose-50"}`}>
                    {selected !== -1 && (
                      <div role="status" className="flex items-start gap-2.5">
                        {selected === current.answerIndex ? <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" aria-hidden="true" /> : <XCircle className="w-6 h-6 shrink-0 text-rose-500" aria-hidden="true" />}
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900">{selected === current.answerIndex ? "맞았어요!" : "정답을 확인해봐요"}</h3>
                          {selected !== current.answerIndex && <p className="mt-2 text-sm font-semibold text-gray-900">{(current.revealedChoices ?? current.choices)[current.answerIndex]}</p>}
                        </div>
                      </div>
                    )}
                    <p className={`${selected === -1 ? "" : "mt-3 "}text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line`}>{current.explanation}</p>
                    {current.article && (
                      <button onClick={() => setArticleOpen(true)} aria-haspopup="dialog" className="mt-4 flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left hover:bg-white/80">
                        <Newspaper className="w-5 h-5 shrink-0 text-indigo-600" aria-hidden="true" />
                        <span className="min-w-0 flex-1"><span className="block text-xs text-gray-500">관련 기사</span><span className="block mt-1 text-sm font-medium text-gray-900">{current.article.title}</span></span>
                        <ChevronRight className="w-5 h-5 shrink-0 text-gray-400" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
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

      {stage === "playing" && current && (
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 safe-area-bottom">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={checked ? handleNext : handleCheck}
              disabled={selected === null || submitting}
              className="w-full min-h-12 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
            >
              {submitting ? "저장 중…" : checked ? index + 1 >= total ? "완료" : "다음" : "확인"}
            </button>
          </div>
        </div>
      )}
      {articleOpen && current?.article && <QuizArticleSheet article={current.article} onClose={() => setArticleOpen(false)} />}
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
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
        <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">퀴즈로 배우는 시황</h1>
      <p className="text-sm text-gray-500 mb-1">
        {data.dataDate
          ? `${formatDateKorean(data.dataDate)} 시장 데이터로 만든 문제예요`
          : "시장 데이터를 준비하고 있어요"}
      </p>
      <p className="text-xs text-gray-400 mb-8">{data.questions.length ? `${data.questions.length}문제 · 약 3분 · 처음이어도 괜찮아요` : "출제할 시황 데이터가 아직 부족해요"}</p>

      <button
        onClick={onStart}
        disabled={data.questions.length === 0}
        className="w-full md:w-64 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        시작
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
                    h.score === h.total ? "text-indigo-600" : "text-gray-500"
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
  const choices = checked ? question.revealedChoices ?? question.choices : question.choices;
  const passage = checked ? question.revealedPassage ?? question.passage : question.passage;
  const context = checked ? question.revealedLearningContext ?? question.learningContext : question.learningContext;

  return (
    <div>
      <div className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 text-[11px] font-medium text-gray-500 mb-3">
        {question.tag}
      </div>
      {context && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-indigo-50 px-4 py-4">
          <Newspaper className="mt-0.5 w-5 h-5 shrink-0 text-indigo-500" aria-hidden="true" />
          <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">{context}</p>
        </div>
      )}
      <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-snug mb-4">
        {question.prompt}
      </h2>

      {passage && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-gray-50 border-l-4 border-indigo-200 text-sm text-gray-600 leading-relaxed">
          {passage}
        </div>
      )}

      <div className="space-y-2.5">
        {choices.map((choice, i) => {
          const isSelected = selected === i;
          const isAnswer = i === question.answerIndex;

          let style = "border-gray-200 bg-white hover:bg-gray-50 text-gray-700";
          if (checked && isAnswer)
            style = "border-emerald-500 bg-emerald-50 text-emerald-800";
          else if (checked && isSelected)
            style = "border-rose-400 bg-rose-50 text-rose-800";
          else if (isSelected)
            style = "border-indigo-500 bg-indigo-50 text-indigo-800";

          return (
            <button
              key={`${question.id}-${i}`}
              onClick={() => !checked && onSelect(i)}
              disabled={checked}
              aria-pressed={isSelected}
              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 border-b-4 text-left text-sm md:text-base font-medium leading-relaxed transition-colors ${style} ${
                checked ? "cursor-default" : ""
              }`}
            >
              <span
                className={`w-6 h-6 mt-0.5 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isSelected || (checked && isAnswer)
                    ? "bg-white/70 text-current"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1">{choice}</span>
              {checked && isAnswer && (
                <svg className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {checked && isSelected && !isAnswer && (
                <svg className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    ? "오늘 학습 완료!"
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
            perfect ? "bg-indigo-50" : "bg-gray-100"
          }`}
        >
          <span
            className={`text-3xl font-bold tabular-nums ${
              perfect ? "text-indigo-600" : "text-gray-700"
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
                      ok ? "bg-indigo-100 text-indigo-600" : "bg-rose-100 text-rose-500"
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
                    <p className="text-sm text-indigo-700 mt-1">
                      정답 · {(q.revealedChoices ?? q.choices)[q.answerIndex]}
                    </p>
                    {!ok && mine >= 0 && mine !== undefined && (
                      <p className="text-xs text-rose-500 mt-0.5">
                        내 답 · {(q.revealedChoices ?? q.choices)[mine]}
                      </p>
                    )}
                  </div>
                </div>
                {q.revealedPassage && <p className="mb-3 rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">{q.revealedPassage}</p>}
                <p className="text-xs text-gray-500 leading-relaxed pl-8 whitespace-pre-line">
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
