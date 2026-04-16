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
      {/* Date button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-semibold text-gray-900">
          {selectedDate
            ? `${selectedDate.slice(0, 4)}년 ${parseInt(selectedDate.slice(4, 6))}월 ${parseInt(selectedDate.slice(6, 8))}일 ${WEEKDAYS[parseDate(selectedDate).getDay()]}요일`
            : "날짜를 선택하세요"
          }
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-5 w-[320px]">
          {/* Month/Year header with navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {selectedYear}년 {selectedMonth + 1}월
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
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
                  className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : hasData
                      ? "hover:bg-blue-50 font-medium text-gray-900"
                      : "hover:bg-gray-50 text-gray-300"
                  }`}
                >
                  <span className={
                    isSelected
                      ? "text-white"
                      : isToday
                      ? "text-blue-600 font-bold"
                      : isSunday && !hasData
                      ? "text-red-300"
                      : isSunday
                      ? "text-red-500"
                      : isSaturday && !hasData
                      ? "text-blue-300"
                      : isSaturday
                      ? "text-blue-500"
                      : ""
                  }>
                    {day.getDate()}
                  </span>
                  {hasData && (
                    <span className={`absolute bottom-0.5 text-[8px] leading-none ${
                      isSelected ? "text-blue-200" : "text-blue-500"
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
