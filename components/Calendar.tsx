"use client";

import { useMemo, useRef, useEffect } from "react";
import { WEEKDAYS, MONTHS_KR, getDaysInMonth, toDateStr, parseDate } from "@/lib/date";

interface CalendarProps {
  selectedDate: string;
  datesWithData: Set<string>;
  dateCountMap: Map<string, number>;
  years: number[];
  selectedYear: number;
  selectedMonth: number;
  collapsed: boolean;
  onSelectDate: (dateStr: string) => void;
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
  onToggleCollapse: () => void;
}

export default function Calendar({
  selectedDate,
  datesWithData,
  dateCountMap,
  years,
  selectedYear,
  selectedMonth,
  collapsed,
  onSelectDate,
  onSelectYear,
  onSelectMonth,
  onToggleCollapse,
}: CalendarProps) {
  const now = useMemo(() => new Date(), []);
  const todayStr = toDateStr(now);
  const selectedDayRef = useRef<HTMLButtonElement>(null);
  const daysInMonth = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedDayRef.current) {
      selectedDayRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedDate]);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
      >
        <span className="font-semibold text-gray-900">
          {selectedDate
            ? `${selectedDate.slice(0, 4)}년 ${parseInt(selectedDate.slice(4, 6))}월 ${parseInt(selectedDate.slice(6, 8))}일 ${WEEKDAYS[parseDate(selectedDate).getDay()]}요일`
            : "날짜를 선택하세요"
          }
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <>
      {/* Year */}
      <div className="flex gap-2 mb-2">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onSelectYear(y)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedYear === y
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {y}년
          </button>
        ))}
      </div>

      {/* Month */}
      <div className="flex gap-1 mb-3 overflow-x-auto hide-scrollbar">
        {MONTHS_KR.map((label, i) => (
          <button
            key={i}
            onClick={() => onSelectMonth(i)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
              selectedMonth === i
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Days */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {daysInMonth.map((day) => {
          const dateStr = toDateStr(day);
          const weekday = WEEKDAYS[day.getDay()];
          const isSelected = selectedDate === dateStr;
          const hasData = datesWithData.has(dateStr);
          const isToday = dateStr === todayStr;
          const count = dateCountMap.get(dateStr) || 0;
          const isSunday = day.getDay() === 0;
          const isSaturday = day.getDay() === 6;

          return (
            <button
              key={dateStr}
              ref={isSelected ? selectedDayRef : undefined}
              onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center min-w-[44px] px-2 py-1.5 rounded-lg text-xs transition-colors flex-shrink-0 ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : hasData
                  ? "bg-white border border-blue-200 text-gray-700 hover:bg-blue-50"
                  : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className={`text-[10px] ${
                isSelected ? "text-blue-200" : isSunday ? "text-red-400" : isSaturday ? "text-blue-400" : "text-gray-400"
              }`}>
                {weekday}
              </span>
              <span className={`font-semibold text-sm leading-tight ${
                isSelected ? "text-white" : isToday ? "text-blue-600" : ""
              }`}>
                {day.getDate()}
              </span>
              {hasData && (
                <span className={`mt-0.5 text-[9px] px-1 rounded-full ${
                  isSelected ? "bg-blue-500 text-blue-100" : "bg-blue-100 text-blue-600"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse button */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center w-full mt-2 py-1 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-xs ml-1">접기</span>
      </button>
    </>
  );
}
