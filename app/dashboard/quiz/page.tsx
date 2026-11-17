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
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const drafts = useRef<Record<number, number | null>>({});
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
      drafts.current = {};
      setJumpTarget(null);
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
    setSelected(answers[index + 1] ?? drafts.current[index + 1] ?? null);
    setChecked(answers[index + 1] !== undefined);
  }, [answers, index, selected, total, finish]);

  const confirmJump = () => {
    if (jumpTarget === null || submitting) return;
    drafts.current[index] = selected;
    setIndex(jumpTarget);
    setSelected(answers[jumpTarget] ?? drafts.current[jumpTarget] ?? null);
    setChecked(answers[jumpTarget] !== undefined);
    setJumpTarget(null);
  };

  // 숫자키로 보기 선택, Enter로 확인/다음 — 반복 학습 속도를 위해
  useEffect(() => {
    if (stage !== "playing" || !current || articleOpen || jumpTarget !== null || submitting) return;
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
  }, [stage, current, checked, handleCheck, handleNext, articleOpen, jumpTarget, submitting]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingIcon className="h-20 w-20 text-primary" label="퀴즈 불러오는 중" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-4">퀴즈를 불러오지 못했습니다</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {stage !== "playing" && <StreakBadge streak={streak} />}
          {stage === "playing" ? (
            <>
              <div className="flex-1 flex gap-1.5 max-w-md">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1}번 문제로 이동`}
                    aria-current={i === index ? "step" : undefined}
                    disabled={i === index || i > answers.length || submitting}
                    onClick={() => setJumpTarget(i)}
                    className="flex min-h-11 flex-1 items-center rounded-full focus-visible:outline-primary disabled:cursor-default"
                  >
                    <span className={`h-2.5 w-full rounded-full transition-colors ${
                      answers[i] !== undefined
                        ? answers[i] === questions[i].answerIndex ? "bg-primary" : "bg-destructive/70"
                        : i === index ? "bg-primary/25" : "bg-border"
                    }`} />
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground/80 tabular-nums flex-shrink-0">
                {index + 1}/{total}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground/80">
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
                  <button onClick={handleSkip} className="mt-4 min-h-11 flex items-center gap-2 mx-auto px-4 text-sm text-muted-foreground hover:text-primary">
                    <CircleHelp className="w-4 h-4" aria-hidden="true" />모르겠어요
                  </button>
                )}
                {checked && (
                  <div ref={feedbackRef} className={`mt-6 rounded-2xl p-4 md:p-5 ${selected === current.answerIndex ? "bg-success-surface" : selected === -1 ? "bg-accent" : "bg-destructive/10"}`}>
                    {selected !== -1 && (
                      <div role="status" className="flex items-start gap-2.5">
                        {selected === current.answerIndex ? <CheckCircle2 className="w-6 h-6 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="w-6 h-6 shrink-0 text-destructive" aria-hidden="true" />}
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground">{selected === current.answerIndex ? "맞았어요!" : "정답을 확인해봐요"}</h3>
                          {selected !== current.answerIndex && <p className="mt-2 text-sm font-semibold text-foreground">{(current.revealedChoices ?? current.choices)[current.answerIndex]}</p>}
                        </div>
                      </div>
                    )}
                    <p className={`${selected === -1 ? "" : "mt-3 "}text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-line`}>{current.explanation}</p>
                    {current.article && (
                      <button onClick={() => setArticleOpen(true)} aria-haspopup="dialog" className="mt-4 flex w-full items-center gap-3 rounded-xl bg-background p-3 text-left hover:bg-background/80">
                        <Newspaper className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">관련 기사</span><span className="block mt-1 text-sm font-medium text-foreground">{current.article.title}</span></span>
                        <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground/80" aria-hidden="true" />
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
        <div className="shrink-0 border-t border-border/60 bg-background px-4 py-3 safe-area-bottom">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={checked ? handleNext : handleCheck}
              disabled={selected === null || submitting}
              className="w-full min-h-12 rounded-xl bg-primary px-6 py-3 text-base font-bold text-white hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground/80 transition-colors"
            >
              {submitting ? "저장 중…" : checked ? index + 1 >= total ? "완료" : "다음" : "확인"}
            </button>
          </div>
        </div>
      )}
      {jumpTarget !== null && <QuestionJumpDialog target={jumpTarget} backward={jumpTarget < index} onCancel={() => setJumpTarget(null)} onConfirm={confirmJump} />}
      {articleOpen && current?.article && <QuizArticleSheet article={current.article} onClose={() => setArticleOpen(false)} />}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0 ${
        streak > 0 ? "bg-warning-surface text-warning" : "bg-muted text-muted-foreground/80"
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
      <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center mx-auto mb-5">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">퀴즈로 배우는 시황</h1>
      <p className="text-sm text-muted-foreground mb-1">
        {data.dataDate
          ? `${formatDateKorean(data.dataDate)} 시장 데이터로 만든 문제예요`
          : "시장 데이터를 준비하고 있어요"}
      </p>
      <p className="text-xs text-muted-foreground/80 mb-8">{data.questions.length ? `${data.questions.length}문제 · 약 3분 · 처음이어도 괜찮아요` : "출제할 시황 데이터가 아직 부족해요"}</p>

      <button
        onClick={onStart}
        disabled={data.questions.length === 0}
        className="w-full md:w-64 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-base transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        시작
      </button>

      {data.history.length > 0 && (
        <div className="mt-10 text-left">
          <div className="text-xs font-medium text-muted-foreground/80 mb-3">
            최근 기록 · 만점 {best}회
          </div>
          <div className="space-y-1.5">
            {data.history.map((h) => (
              <div
                key={h.quizDate}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50"
              >
                <span className="text-sm text-foreground/80">
                  {formatDateKorean(h.quizDate)}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    h.score === h.total ? "text-primary" : "text-muted-foreground"
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
      <div className="inline-block px-2.5 py-1 rounded-lg bg-muted text-[11px] font-medium text-muted-foreground mb-3">
        {question.tag}
      </div>
      {context && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-accent px-4 py-4">
          <Newspaper className="mt-0.5 w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-line">{context}</p>
        </div>
      )}
      <h2 className="text-lg md:text-xl font-bold text-foreground leading-snug mb-4">
        {question.prompt}
      </h2>

      {passage && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-muted/50 border-l-4 border-primary/25 text-sm text-foreground/80 leading-relaxed">
          {passage}
        </div>
      )}

      <div className="space-y-2.5">
        {choices.map((choice, i) => {
          const isSelected = selected === i;
          const isAnswer = i === question.answerIndex;

          let style = "border-border bg-background hover:bg-muted/50 text-foreground/90";
          if (checked && isAnswer)
            style = "border-success bg-success-surface text-success";
          else if (checked && isSelected)
            style = "border-destructive/70 bg-destructive/10 text-destructive";
          else if (isSelected)
            style = "border-primary bg-accent text-primary-hover";

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
                    ? "bg-background/70 text-current"
                    : "bg-muted text-muted-foreground/80"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1">{choice}</span>
              {checked && isAnswer && (
                <svg className="w-5 h-5 mt-0.5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {checked && isSelected && !isAnswer && (
                <svg className="w-5 h-5 mt-0.5 text-destructive flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            perfect ? "bg-accent" : "bg-muted"
          }`}
        >
          <span
            className={`text-3xl font-bold tabular-nums ${
              perfect ? "text-primary" : "text-foreground/90"
            }`}
          >
            {score}
          </span>
          <span className="text-xs text-muted-foreground/80">/ {total}</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1.5">{message}</h1>
        {practice ? (
          <p className="text-sm text-muted-foreground/80">연습 모드 · 기록에는 반영되지 않아요</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {streak > 0 ? `${streak}일 연속 학습 중이에요` : "내일도 이어가볼까요?"}
          </p>
        )}
      </div>

      {reviewed ? (
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground/80">문제 다시 보기</div>
          {questions.map((q, i) => {
            const mine = answers[i];
            const ok = mine === q.answerIndex;
            return (
              <div
                key={q.id}
                className={`px-4 py-3.5 rounded-2xl border ${
                  ok ? "border-border bg-background" : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
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
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {q.prompt}
                    </p>
                    <p className="text-sm text-primary-hover mt-1">
                      정답 · {(q.revealedChoices ?? q.choices)[q.answerIndex]}
                    </p>
                    {!ok && mine >= 0 && mine !== undefined && (
                      <p className="text-xs text-destructive mt-0.5">
                        내 답 · {(q.revealedChoices ?? q.choices)[mine]}
                      </p>
                    )}
                  </div>
                </div>
                {q.revealedPassage && <p className="mb-3 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{q.revealedPassage}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed pl-8 whitespace-pre-line">
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground/80 mb-6">
          오늘 퀴즈는 이미 완료했어요. 내일 새로운 문제로 만나요!
        </p>
      )}

      {(alreadyDone || practice) && (
        <button
          onClick={onPractice}
          className="w-full mt-8 py-3.5 rounded-2xl border-2 border-b-4 border-border text-sm font-bold text-foreground/80 hover:bg-muted/50 transition-colors"
        >
          다시 풀어보기 (연습)
        </button>
      )}
    </div>
  );
}


function QuestionJumpDialog({ target, backward, onCancel, onConfirm }: {
  target: number;
  backward: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="quiz-jump-title" aria-describedby="quiz-jump-description"
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-background p-6 text-foreground shadow-xl backdrop:bg-black/40">
      <h2 id="quiz-jump-title" className="text-lg font-bold">{target + 1}번 문제로 {backward ? "돌아가시겠어요?" : "이동하시겠어요?"}</h2>
      <p id="quiz-jump-description" className="mt-2 text-sm text-muted-foreground">선택한 답과 풀이 기록은 유지돼요.</p>
      <div className="mt-6 flex gap-3">
        <button autoFocus onClick={onCancel} className="min-h-11 flex-1 rounded-xl bg-muted font-semibold text-foreground/80">취소</button>
        <button onClick={onConfirm} className="min-h-11 flex-1 rounded-xl bg-primary font-semibold text-white">이동</button>
      </div>
    </dialog>
  );
}
