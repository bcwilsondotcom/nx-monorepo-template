/**
 * Date Calculator Utilities
 * T088 - Date calculation and manipulation functions
 */

import {
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isBefore,
  isAfter,
  isEqual,
  parseISO,
} from 'date-fns';

/**
 * Add time to date
 */
export function addTime(
  date: Date | string,
  amount: number,
  unit: 'days' | 'months' | 'years'
): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;

  switch (unit) {
    case 'days':
      return addDays(d, amount);
    case 'months':
      return addMonths(d, amount);
    case 'years':
      return addYears(d, amount);
    default:
      return d;
  }
}

/**
 * Subtract time from date
 */
export function subtractTime(
  date: Date | string,
  amount: number,
  unit: 'days' | 'months' | 'years'
): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;

  switch (unit) {
    case 'days':
      return subDays(d, amount);
    case 'months':
      return subMonths(d, amount);
    case 'years':
      return subYears(d, amount);
    default:
      return d;
  }
}

/**
 * Get difference between dates
 */
export function getDateDifference(
  date1: Date | string,
  date2: Date | string,
  unit: 'days' | 'months' | 'years'
): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;

  switch (unit) {
    case 'days':
      return differenceInDays(d1, d2);
    case 'months':
      return differenceInMonths(d1, d2);
    case 'years':
      return differenceInYears(d1, d2);
    default:
      return 0;
  }
}

/**
 * Get start of period
 */
export function getStartOf(
  date: Date | string,
  period: 'day' | 'week' | 'month' | 'year'
): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;

  switch (period) {
    case 'day':
      return startOfDay(d);
    case 'week':
      return startOfWeek(d);
    case 'month':
      return startOfMonth(d);
    case 'year':
      return startOfYear(d);
    default:
      return d;
  }
}

/**
 * Get end of period
 */
export function getEndOf(
  date: Date | string,
  period: 'day' | 'week' | 'month' | 'year'
): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;

  switch (period) {
    case 'day':
      return endOfDay(d);
    case 'week':
      return endOfWeek(d);
    case 'month':
      return endOfMonth(d);
    case 'year':
      return endOfYear(d);
    default:
      return d;
  }
}

/**
 * Check if date is in range
 */
export function isDateInRange(
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;

  return (isAfter(d, s) || isEqual(d, s)) && (isBefore(d, e) || isEqual(d, e));
}

/**
 * Get date range
 */
export function getDateRange(
  start: Date | string,
  end: Date | string
): Date[] {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  const dates: Date[] = [];

  let current = s;
  while (isBefore(current, e) || isEqual(current, e)) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Check if date is weekend
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if date is weekday
 */
export function isWeekday(date: Date | string): boolean {
  return !isWeekend(date);
}

/**
 * Get next weekday
 */
export function getNextWeekday(date: Date | string): Date {
  let d = typeof date === 'string' ? parseISO(date) : new Date(date);
  d = addDays(d, 1);

  while (isWeekend(d)) {
    d = addDays(d, 1);
  }

  return d;
}

/**
 * Get business days between dates
 */
export function getBusinessDaysBetween(
  start: Date | string,
  end: Date | string
): number {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;

  let count = 0;
  let current = s;

  while (isBefore(current, e) || isEqual(current, e)) {
    if (isWeekday(current)) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
}