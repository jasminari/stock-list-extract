"use client";

import { useMemo } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LEGEND_COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

function getContributionFill(count: number): string {
  if (count === 0) return "#ebedf0";
  if (count <= 2) return "#9be9a8";
  if (count <= 5) return "#40c463";
  if (count <= 8) return "#30a14e";
  return "#216e39";
}

function generateYearContributions(year: number): { date: string; count: number }[] {
  const data: { date: string; count: number }[] = [];
  const today = new Date();
  const start = new Date(year, 0, 1);
  const end = year === today.getFullYear() ? today : new Date(year, 11, 31);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const rand = Math.random();
    let count = 0;

    if (isWeekend) {
      if (rand > 0.7) count = Math.floor(Math.random() * 3) + 1;
    } else {
      if (rand > 0.3) count = Math.floor(Math.random() * 8) + 1;
      if (rand > 0.85) count = Math.floor(Math.random() * 5) + 8;
    }

    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    data.push({ date: dateStr, count });
  }
  return data;
}

interface ContributionGraphProps {
  year: number;
}

export default function ContributionGraph({ year }: ContributionGraphProps) {
  const contributions = useMemo(() => generateYearContributions(year), [year]);

  const totalContributions = useMemo(
    () => contributions.reduce((sum, c) => sum + c.count, 0),
    [contributions]
  );

  const weeks = useMemo(() => {
    const FIXED_WEEKS = 53;
    const result: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];

    const dataMap = new Map<string, number>();
    for (const c of contributions) {
      dataMap.set(c.date, c.count);
    }

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    const firstDayOfWeek = start.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: "", count: -1 });
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = dataMap.get(dateStr) ?? 0;
      const today = new Date();
      const isFuture = d > today;
      currentWeek.push({ date: dateStr, count: isFuture ? -1 : count });

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: "", count: -1 });
      }
      result.push(currentWeek);
    }

    while (result.length < FIXED_WEEKS) {
      result.push(Array(7).fill({ date: "", count: -1 }));
    }

    return result;
  }, [contributions, year]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIdx) => {
      for (const day of week) {
        if (day.date) {
          const month = new Date(day.date).getMonth();
          if (month !== lastMonth) {
            labels.push({ label: MONTHS[month], col: weekIdx });
            lastMonth = month;
          }
          break;
        }
      }
    });

    return labels;
  }, [weeks]);

  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;
  const DAY_LABEL_WIDTH = 36;
  const gridWidth = weeks.length * STEP;
  const totalWidth = DAY_LABEL_WIDTH + gridWidth;

  return (
    <div>
      <h2 className="text-base font-medium text-gray-800 mb-4">
        {year}년에 <span className="font-bold text-gray-900">{totalContributions}건</span>의 상승이유를 등록했습니다
      </h2>

      <div className="border border-gray-200 rounded-lg p-4">
        <svg
          width="100%"
          viewBox={`0 0 ${totalWidth + 8} ${STEP * 7 + 24 + 8}`}
          className="block"
        >
          {monthLabels.map((m, i) => (
            <text key={i} x={DAY_LABEL_WIDTH + m.col * STEP} y={10} fill="#9ca3af" fontSize={10}>
              {m.label}
            </text>
          ))}

          {DAY_LABELS.map((label, i) =>
            label ? (
              <text key={i} x={0} y={20 + i * STEP + CELL - 1} fill="#9ca3af" fontSize={10}>
                {label}
              </text>
            ) : null
          )}

          {weeks.map((week, wi) =>
            week.map((day, di) =>
              day.count === -1 ? null : (
                <rect
                  key={`${wi}-${di}`}
                  x={DAY_LABEL_WIDTH + wi * STEP}
                  y={18 + di * STEP}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={getContributionFill(day.count)}
                >
                  {day.date && <title>{`${day.date}: ${day.count}건 등록`}</title>}
                </rect>
              )
            )
          )}

          {(() => {
            const legendY = 18 + 7 * STEP + 8;
            const legendX = totalWidth - LEGEND_COLORS.length * STEP - 60;
            return (
              <>
                <text x={legendX} y={legendY + CELL - 1} fill="#9ca3af" fontSize={10}>
                  Less
                </text>
                {LEGEND_COLORS.map((color, i) => (
                  <rect
                    key={i}
                    x={legendX + 30 + i * STEP}
                    y={legendY}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={color}
                  />
                ))}
                <text
                  x={legendX + 30 + LEGEND_COLORS.length * STEP + 4}
                  y={legendY + CELL - 1}
                  fill="#9ca3af"
                  fontSize={10}
                >
                  More
                </text>
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
