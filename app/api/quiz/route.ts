import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import {
  getLatestDataDate,
  getStocksByDate,
  getQuizAttempt,
  listQuizAttempts,
  saveQuizAttempt,
} from "@/lib/storage-db";
import { formatDbStocks } from "@/lib/format";
import { getTodayStr } from "@/lib/date";
import { buildDailyQuiz, calcStreak, type QuizQuestion } from "@/lib/quiz";

/**
 * 문제는 (유저 id + 날짜) 시드로 결정적으로 생성된다.
 * 그래서 채점 시 문제를 다시 만들어도 GET 때와 같은 문제가 나온다.
 */
async function loadQuiz(userId: number, quizDate: string) {
  let dataDate: string | null = null;
  let stocks: ReturnType<typeof formatDbStocks> = [];

  if (isDbConfigured()) {
    dataDate = await getLatestDataDate(quizDate);
    if (dataDate) stocks = formatDbStocks(await getStocksByDate(dataDate));
  }

  const questions = buildDailyQuiz({
    seedKey: `${userId}:${quizDate}`,
    stocks,
    dataDate,
  });

  return { questions, dataDate };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const quizDate = getTodayStr();
    const { questions, dataDate } = await loadQuiz(userId, quizDate);

    if (!isDbConfigured()) {
      return NextResponse.json({
        quizDate,
        dataDate,
        questions,
        attempt: null,
        streak: 0,
        history: [],
        persisted: false,
      });
    }

    // 기록 조회가 실패해도(테이블 미생성 등) 퀴즈 자체는 풀 수 있어야 한다
    try {
      const [attempt, history] = await Promise.all([
        getQuizAttempt(userId, quizDate),
        listQuizAttempts(userId),
      ]);

      return NextResponse.json({
        quizDate,
        dataDate,
        questions,
        attempt,
        streak: calcStreak(
          history.map((h) => h.quizDate),
          quizDate
        ),
        history: history.slice(0, 7),
        persisted: true,
      });
    } catch (dbError) {
      console.error("[quiz] 기록 조회 실패", dbError);
      return NextResponse.json({
        quizDate,
        dataDate,
        questions,
        attempt: null,
        streak: 0,
        history: [],
        persisted: false,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { answers } = await req.json();
    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers 배열이 필요합니다" },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    const quizDate = getTodayStr();
    const { questions, dataDate } = await loadQuiz(userId, quizDate);

    // 정답은 서버에서 다시 만든 문제로 채점한다 (클라이언트 점수를 믿지 않는다)
    const correct = questions.map(
      (q: QuizQuestion, i: number) => answers[i] === q.answerIndex
    );
    const score = correct.filter(Boolean).length;
    const total = questions.length;

    if (!isDbConfigured()) {
      return NextResponse.json({
        score,
        total,
        correct,
        streak: 0,
        recorded: false,
      });
    }

    // 채점 결과는 기록 저장이 실패해도 그대로 돌려준다
    try {
      const recorded = await saveQuizAttempt(
        userId,
        quizDate,
        dataDate ?? "",
        score,
        total
      );
      const history = await listQuizAttempts(userId);

      return NextResponse.json({
        score,
        total,
        correct,
        streak: calcStreak(
          history.map((h) => h.quizDate),
          quizDate
        ),
        recorded,
      });
    } catch (dbError) {
      console.error("[quiz] 기록 저장 실패", dbError);
      return NextResponse.json({
        score,
        total,
        correct,
        streak: 0,
        recorded: false,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
