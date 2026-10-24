'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fromDayKey, toDayKey } from '@/lib/dates';
import { useFormat, useI18n } from '@/lib/i18n';

// Monday-first grid of the month containing `monthKey` ("YYYY-MM-DD", any day of that month)
export function monthGrid(monthKey: string): string[] {
  const first = fromDayKey(monthKey);
  first.setDate(1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => toDayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

export function shiftMonth(monthKey: string, delta: number): string {
  const d = fromDayKey(monthKey);
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

interface MonthCalendarProps {
  monthKey: string;
  selectedDay: string;
  today: string;
  onSelectDay: (key: string) => void;
  onChangeMonth: (monthKey: string) => void;
  // Extra content in each day cell (dots, chips...)
  renderDay?: (key: string) => React.ReactNode;
  // Background tint for a day (e.g. sprint period, study intensity)
  dayClassName?: (key: string) => string;
}

export function MonthCalendar({ monthKey, selectedDay, today, onSelectDay, onChangeMonth, renderDay, dayClassName }: MonthCalendarProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const month = fromDayKey(monthKey).getMonth();
  const label = fmt.month(fromDayKey(monthKey));
  const weekdays = t('cal.weekdays').split(',');

  return (
    <div className="p-3 md:p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => onChangeMonth(shiftMonth(monthKey, -1))} className="p-1.5 rounded-xl hover:bg-[#EBF5F0] text-[#607367]" title={t('cal.prev')}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#1C2B22]">{label}</span>
          {selectedDay !== today || fromDayKey(today).getMonth() !== month || fromDayKey(today).getFullYear() !== fromDayKey(monthKey).getFullYear() ? (
            <button
              onClick={() => {
                onChangeMonth(today);
                onSelectDay(today);
              }}
              className="text-[11px] font-bold text-[#2F8F5B] px-2 py-0.5 rounded-full bg-[#EBF5F0]"
            >
              {t('cal.today')}
            </button>
          ) : null}
        </div>
        <button onClick={() => onChangeMonth(shiftMonth(monthKey, 1))} className="p-1.5 rounded-xl hover:bg-[#EBF5F0] text-[#607367]" title={t('cal.next')}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#8A9E92]">
        {weekdays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthGrid(monthKey).map((key) => {
          const inMonth = fromDayKey(key).getMonth() === month;
          const isSelected = key === selectedDay;
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              className={`min-h-[52px] md:min-h-[64px] p-1 rounded-xl flex flex-col items-center gap-0.5 border transition-colors ${
                isSelected ? 'border-[#2F8F5B] ring-1 ring-[#2F8F5B]' : 'border-transparent hover:border-[#C8E3D3]'
              } ${dayClassName?.(key) || ''} ${inMonth ? '' : 'opacity-40'}`}
            >
              <span
                className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-[#2F8F5B] text-white' : 'text-[#1C2B22]'
                }`}
              >
                {fromDayKey(key).getDate()}
              </span>
              {renderDay?.(key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
