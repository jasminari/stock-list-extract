"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { WEEKDAYS, getDaysInMonth, toDateStr, parseDate } from "@/lib/date";

interface CalendarProps {
  selectedDate: string;
  datesWithData: Set<string>;
  dateCountMap: Map<string, number>;
  years: number[];
  selectedYear: number;
  selectedMonth: number;
  onSelectDate: (dateStr: string) => void;
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
}

export default function Calendar({
  selectedDate,
  datesWithData,
  dateCountMap,
  years,
  selectedYear,
  selectedMonth,
  onSelectDate,
  onSelectYear,
  onSelectMonth,
}: CalendarProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);
  const todayStr = toDateStr(now);
  const daysInMonth = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  // 월의 첫째 날 요일 (0=일, 1=월, ...)
  const firstDayOfWeek = useMemo(() => new Date(selectedYear, selectedMonth, 1).getDay(), [selectedYear, selectedMonth]);

  const handleSelectDate = useCallback((dateStr: string) => {
    onSelectDate(dateStr);
    setOpen(false);
  }, [onSelectDate]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handlePrevMonth = useCallback(() => {
    if (selectedMonth === 0) {
      const prevYear = selectedYear - 1;
      if (years.includes(prevYear) || prevYear >= now.getFullYear() - 1) {
        onSelectYear(prevYear);
        onSelectMonth(11);
      }
    } else {
      onSelectMonth(selectedMonth - 1);
    }
  }, [selectedMonth, selectedYear, years, now, onSelectYear, onSelectMonth]);

  const handleNextMonth = useCallback(() => {
    if (selectedMonth === 11) {
      const nextYear = selectedYear + 1;
      if (years.includes(nextYear) || nextYear <= now.getFullYear() + 1) {
        onSelectYear(nextYear);
        onSelectMonth(0);
      }
    } else {
      onSelectMonth(selectedMonth + 1);
    }
  }, [selectedMonth, selectedYear, years, now, onSelectYear, onSelectMonth]);

  return (
    <div className="relative" ref={containerRef}>
      {/* 날짜 버튼 — 화면 제목 역할을 겸한다 */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group -ml-2 flex items-center gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {selectedDate
            ? `${selectedDate.slice(0, 4)}년 ${parseInt(selectedDate.slice(4, 6))}월 ${parseInt(selectedDate.slice(6, 8))}일 ${WEEKDAYS[parseDate(selectedDate).getDay()]}요일`
            : "날짜를 선택하세요"
          }
        </span>
        <svg className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-background p-4 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Month/Year header with navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[15px] font-semibold text-foreground">
              {selectedYear}년 {selectedMonth + 1}월
            </span>
            <button
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd, i) => (
              <div
                key={wd}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? "text-rise/70" : i === 6 ? "text-fall/70" : "text-muted-foreground/80"
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {daysInMonth.map((day) => {
              const dateStr = toDateStr(day);
              const isSelected = selectedDate === dateStr;
              const hasData = datesWithData.has(dateStr);
              const isToday = dateStr === todayStr;
              const count = dateCountMap.get(dateStr) || 0;
              const isSunday = day.getDay() === 0;
              const isSaturday = day.getDay() === 6;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-colors ${
                    isSelected
                      ? "bg-primary text-white"
                      : hasData
                      ? "hover:bg-accent font-medium text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground/50"
                  }`}
                >
                  <span className={
                    isSelected
                      ? "text-white"
                      : isToday
                      ? "text-primary font-bold"
                      : isSunday && !hasData
                      ? "text-rise/40"
                      : isSunday
                      ? "text-rise"
                      : isSaturday && !hasData
                      ? "text-fall/40"
                      : isSaturday
                      ? "text-fall"
                      : ""
                  }>
                    {day.getDate()}
                  </span>
                  {hasData && (
                    <span className={`absolute bottom-0.5 text-[9px] leading-none ${
                      isSelected ? "text-primary-foreground/80" : "text-primary"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
