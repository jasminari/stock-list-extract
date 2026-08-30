"use client";

import { useMemo, useState } from "react";
import type { OwnershipRow } from "@/lib/types";

/** YYYYMMDD → "25-02-13" (표가 좁아 두 자리 연도로 줄인다) */
function shortDate(s: string) {
  if (!/^\d{8}$/.test(s)) return "-";
  return `${s.slice(2, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function int(n: number | null) {
  return n === null ? "-" : n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function pct(n: number | null) {
  return n === null ? "-" : `${n.toFixed(2)}%`;
}

/** 접수번호로 DART 원문 뷰어를 연다 */
function dartUrl(rceptNo: string) {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
}

/** 툴팁용. 원 단위 금액을 억/조로 줄여 자릿수를 바로 읽게 한다 */
function shortMoney(won: number) {
  const sign = won < 0 ? "-" : "";
  const abs = Math.abs(won);
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}조원`;
  if (abs >= 1e8) return `${sign}${Math.round(abs / 1e8).toLocaleString("ko-KR")}억원`;
  if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString("ko-KR")}만원`;
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

/**
 * 총액 막대의 눈금. 한 화면에 1백만원짜리와 100억원짜리가 같이 있어서
 * 최댓값 대비 선형 비례로 그리면 큰 거 하나만 보이고 나머지는 전부 실선이 된다.
 * 그래서 자릿수(1백만 → 1천만 → 1억 → 10억 → 100억 → 1천억)를 눈금으로 잡고
 * 로그로 눕힌다. 구간이 한 칸 오를 때마다 막대가 같은 폭씩 길어진다.
 */
const BAR_MIN = 1e6; // 1백만원
const BAR_MAX = 1e11; // 1천억원
const BAR_STEPS = Math.log10(BAR_MAX) - Math.log10(BAR_MIN); // 자릿수 구간 개수(5)

/** 구간이 올라갈수록 진해진다 — 길이만으로는 한 칸 차이가 잘 안 읽힌다 */
const BAR_TIERS = [
  { min: 1e10, alpha: 0.85 }, // 100억 이상
  { min: 1e9, alpha: 0.7 }, //  10억
  { min: 1e8, alpha: 0.55 }, //   1억
  { min: 1e7, alpha: 0.42 }, //   1천만
  { min: 0, alpha: 0.3 }, //   그 미만
];

/** 매수는 빨강, 매도는 파랑 — 증감 컬럼의 색 규칙을 그대로 따른다 */
const BUY_RGB = "225, 29, 72";
const SELL_RGB = "37, 99, 235";

function barStyle(amount: number, isSell: boolean): React.CSSProperties {
  const abs = Math.abs(amount);
  const t = (Math.log10(Math.max(abs, 1)) - Math.log10(BAR_MIN)) / BAR_STEPS;
  const width = Math.min(100, Math.max(4, t * 100));
  const rgb = isSell ? SELL_RGB : BUY_RGB;
  const a = BAR_TIERS.find((tier) => abs >= tier.min)!.alpha;
  return {
    width: `${width}%`,
    // 왼쪽은 진하게, 오른쪽으로 갈수록 옅게 — 레퍼런스의 엑셀 데이터 막대와 같은 결
    background: `linear-gradient(to right, rgba(${rgb}, ${a}) 0%, rgba(${rgb}, ${a * 0.18}) 100%)`,
  };
}

/** 자릿수 눈금선. 막대가 어느 구간인지 눈으로 읽을 수 있게 칸을 나눠 둔다 */
const BAR_TICKS: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to right, rgba(15,23,42,0.07) 0 1px, transparent 1px ${100 / BAR_STEPS}%)`,
};

type Filter = "all" | "buy" | "sell";
type Dir = "asc" | "desc";
type SortCol =
  | "corpName"
  | "subject"
  | "holderName"
  | "firstDate"
  | "lastDate"
  | "method"
  | "delta"
  | "after"
  | "ratioBefore"
  | "ratioAfter"
  | "unitPrice"
  | "amount";

/** 헤더에 뿌릴 컬럼 정의. 처음 눌렀을 때의 방향은 그 컬럼을 볼 때 보통 궁금한 쪽으로 잡는다 */
const COLUMNS: { col: SortCol; label: string; dir: Dir; short?: string }[] = [
  { col: "corpName", label: "종목명", dir: "asc", short: "종목" },
  { col: "subject", label: "공시주체", dir: "asc", short: "주체" },
  { col: "holderName", label: "이름", dir: "asc" },
  { col: "firstDate", label: "최초변동일", dir: "desc" },
  { col: "lastDate", label: "최종변동일", dir: "desc" },
  { col: "method", label: "취득방법", dir: "asc", short: "방법" },
  { col: "delta", label: "증감", dir: "desc" },
  { col: "after", label: "변동후", dir: "desc" },
  { col: "ratioBefore", label: "지분율(전)", dir: "desc", short: "지분전" },
  { col: "ratioAfter", label: "지분율(후)", dir: "desc", short: "지분후" },
  { col: "unitPrice", label: "취득단가", dir: "desc" },
  { col: "amount", label: "총액", dir: "desc" },
];

/**
 * 모바일 셀 폭이 빠듯해 접두어를 뗀다. 장내매수→매수, 시간외매매→시간외.
 * 장외는 장내와 구분해야 하므로 그대로 둔다.
 */
function shortMethod(m: string) {
  return m === "시간외매매" ? "시간외" : m.replace(/^장내/, "");
}

/**
 * 좁은 화면에서 살릴 컬럼. 12칸을 다 밀어 넣으면 가로 스크롤만 남아
 * 어느 행을 보고 있는지조차 놓치게 된다. "누가 · 어떻게 · 얼마나"만 남긴다.
 */
const MOBILE_COLS = new Set<SortCol>([
  "corpName",
  "subject",
  "method",
  "ratioBefore",
  "ratioAfter",
  "amount",
]);

/** 모바일에서 감출 칸에 붙인다. th와 td에 똑같이 붙어야 열이 안 어긋난다 */
const hideSm = (col: SortCol) =>
  MOBILE_COLS.has(col) ? "" : "hidden md:table-cell";

/**
 * 정렬에 쓸 값. 총액은 데이터상 항상 양수(크기)라서 화면에 보이는 대로
 * 매도에 음수 부호를 붙여 비교한다 — 눈에 보이는 순서와 정렬이 어긋나면 안 된다.
 */
function sortValue(r: OwnershipRow, col: SortCol): string | number | null {
  if (col === "amount") {
    return r.amount === null ? null : r.delta < 0 ? -r.amount : r.amount;
  }
  return r[col];
}

/** 값이 없는 행(-)은 방향과 상관없이 항상 뒤로 보낸다 */
function compareBy(
  a: OwnershipRow,
  b: OwnershipRow,
  col: SortCol,
  dir: Dir
): number {
  const av = sortValue(a, col);
  const bv = sortValue(b, col);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  const c =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv), "ko");
  return dir === "desc" ? -c : c;
}

/** 종목 안에서 그 종목을 대표할 행 — 정렬 방향에서 맨 앞에 설 행이 곧 대표다 */
function leadRow(group: OwnershipRow[], col: SortCol, dir: Dir): OwnershipRow {
  return group.reduce((best, r) => (compareBy(r, best, col, dir) < 0 ? r : best));
}

export default function OwnershipTable({ rows }: { rows: OwnershipRow[] }) {
  // 기본은 총액 큰 순 — 그날 무엇이 컸는지가 이 표를 여는 이유다.
  // null로 두면 원본 순서(공시 접수 순)이고, 정렬 칩의 ✕로 그 상태로 돌아간다.
  const [sort, setSort] = useState<{ col: SortCol; dir: Dir } | null>({
    col: "amount",
    dir: "desc",
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  /** 같은 헤더를 다시 누르면 방향만 뒤집는다 */
  const toggleSort = (col: SortCol) => {
    const fallback = COLUMNS.find((c) => c.col === col)!.dir;
    setSort((cur) =>
      cur?.col === col
        ? { col, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { col, dir: fallback }
    );
  };

  const view = useMemo(() => {
    const q = query.trim();
    let out = rows;
    if (filter !== "all") {
      out = out.filter((r) => (filter === "buy" ? r.delta > 0 : r.delta < 0));
    }
    if (q) {
      out = out.filter(
        (r) =>
          r.corpName.includes(q) ||
          r.holderName.includes(q) ||
          r.subject.includes(q)
      );
    }
    if (!sort) return out;

    // 한 종목의 여러 보고가 표 여기저기로 흩어지면 읽을 수가 없다.
    // 그래서 행이 아니라 종목 덩어리를 정렬한다 —
    // 덩어리 순서는 그 안에서 가장 앞에 설 행(대표 행)이 정하고, 덩어리 안도 같은 기준으로 줄 세운다.
    const groups = new Map<string, OwnershipRow[]>();
    for (const r of out) {
      const g = groups.get(r.corpName);
      if (g) g.push(r);
      else groups.set(r.corpName, [r]);
    }

    const { col, dir } = sort;
    return [...groups.values()]
      .map((g) => [...g].sort((a, b) => compareBy(a, b, col, dir)))
      .sort((ga, gb) =>
        compareBy(leadRow(ga, col, dir), leadRow(gb, col, dir), col, dir)
      )
      .flat();
  }, [rows, sort, filter, query]);

  const th =
    "px-1 md:px-2 py-1.5 font-semibold text-gray-800 border border-amber-300/70 whitespace-nowrap";
  const td = "px-1 md:px-2 py-1.5 border border-gray-200 whitespace-nowrap";
  // 총액 칸은 막대를 셀 가장자리까지 채워야 해서 안쪽 span이 여백을 맡는다
  const tdBar = "border border-gray-200 whitespace-nowrap";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
          {(
            [
              ["all", "전체"],
              ["buy", "매수"],
              ["sell", "매도"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 transition-colors ${
                filter === id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {sort && (
          <button
            onClick={() => setSort(null)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            title="공시 접수 순으로 되돌립니다"
          >
            {COLUMNS.find((c) => c.col === sort.col)!.label}{" "}
            {sort.dir === "desc" ? "내림차순" : "오름차순"} ✕
          </button>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목·이름 검색"
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <span className="text-xs text-gray-500 ml-auto">
          {view.length}건 / 전체 {rows.length}건
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-[10px] md:text-xs border-collapse">
          <thead className="bg-amber-200/80 sticky top-0">
            <tr>
              {COLUMNS.map(({ col, label, short }) => {
                const active = sort?.col === col;
                return (
                  <th key={col} className={`${th} ${hideSm(col)}`} aria-sort={
                    active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"
                  }>
                    <button
                      onClick={() => toggleSort(col)}
                      className={`w-full flex items-center justify-center gap-1 hover:text-indigo-800 transition-colors ${
                        active ? "text-indigo-800" : ""
                      }`}
                      title={`${label} 기준 정렬 (종목 단위로 묶여 이동합니다)`}
                    >
                      {short ? (
                        <>
                          <span className="md:hidden">{short}</span>
                          <span className="hidden md:inline">{label}</span>
                        </>
                      ) : (
                        label
                      )}
                      {/* 정렬 안 걸린 컬럼의 ⇅는 모바일에서 감춘다.
                          아이콘 하나가 14px씩 먹어 6칸이면 한 화면을 넘긴다 */}
                      <span
                        className={active ? "" : "hidden md:inline text-gray-400/70"}
                      >
                        {active ? (sort!.dir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => {
              const isSell = r.delta < 0;
              return (
                <tr
                  key={`${r.rceptNo}-${r.holderName}-${r.method}-${i}`}
                  className={isSell ? "bg-rose-50" : "bg-white"}
                >
                  <td className={`${td} max-w-[4.5rem] md:max-w-none truncate`} title={r.corpName}>
                    <a
                      href={dartUrl(r.rceptNo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-indigo-700 hover:underline"
                      title="DART 원문 보기"
                    >
                      {r.corpName}
                    </a>
                  </td>
                  <td className={`${td} text-gray-600 max-w-[5rem] md:max-w-[13rem] truncate`} title={r.subject}>
                    {r.subject}
                  </td>
                  <td className={`${td} ${hideSm("holderName")} max-w-[11rem] truncate`} title={r.holderName}>
                    {r.holderName}
                  </td>
                  <td className={`${td} ${hideSm("firstDate")} text-center text-gray-600`}>{shortDate(r.firstDate)}</td>
                  <td className={`${td} ${hideSm("lastDate")} text-center text-gray-600`}>{shortDate(r.lastDate)}</td>
                  <td className={`${td} text-center`}>
                    <span className="md:hidden">{shortMethod(r.method)}</span>
                    <span className="hidden md:inline">{r.method}</span>
                  </td>
                  <td className={`${td} ${hideSm("delta")} text-right tabular-nums font-medium ${isSell ? "text-blue-700" : "text-red-600"}`}>
                    {int(r.delta)}
                  </td>
                  <td className={`${td} ${hideSm("after")} text-right tabular-nums`}>{int(r.after)}</td>
                  <td className={`${td} text-right tabular-nums text-gray-600`}>{pct(r.ratioBefore)}</td>
                  <td className={`${td} text-right tabular-nums`}>{pct(r.ratioAfter)}</td>
                  <td className={`${td} ${hideSm("unitPrice")} text-right tabular-nums`}>{int(r.unitPrice)}</td>
                  <td
                    className={`${tdBar} text-right tabular-nums relative min-w-[4.5rem] md:min-w-[11rem]`}
                    style={r.amount === null ? undefined : BAR_TICKS}
                    title={r.amount === null ? undefined : shortMoney(r.amount)}
                  >
                    {/* 금액 위에 막대를 깔아 규모를 한눈에 비교하게 한다 */}
                    {r.amount !== null && (
                      <span
                        aria-hidden
                        className="absolute inset-y-px left-0 rounded-r-sm"
                        style={barStyle(r.amount, isSell)}
                      />
                    )}
                    {/* 모바일은 원 단위를 다 적을 자리가 없다 — 억/조로 줄여야 한 화면에 들어간다 */}
                    <span className="relative block px-1 md:px-2 py-1.5">
                      {r.amount === null ? (
                        "-"
                      ) : (
                        <>
                          <span className="md:hidden">
                            {shortMoney(isSell ? -r.amount : r.amount)}
                          </span>
                          <span className="hidden md:inline">
                            {isSell ? "-" : ""}
                            {int(r.amount)}
                          </span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
            {view.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-gray-400">
                  조건에 맞는 공시가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
        헤더를 누르면 정렬됩니다. 한 종목의 보고가 흩어지지 않도록 종목 단위로 묶어서 옮깁니다.
        총액 막대는 1백만 · 1천만 · 1억 · 10억 · 100억 · 1천억 구간의 로그 눈금이며,
        칸 하나가 자릿수 하나이고 구간이 높을수록 진하게 표시됩니다.
      </p>
    </div>
  );
}
