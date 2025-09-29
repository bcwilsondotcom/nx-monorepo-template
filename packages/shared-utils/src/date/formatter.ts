/**
 * Date Formatting Utilities
 * T088 - Date and time formatting functions
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Format date to ISO string
 */
export function toISOString(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString();
}

/**
 * Format date with custom format
 */
export function formatDate(date: Date | string, formatString: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatString);
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
}

/**
 * Format date for display
 */
export function formatDisplay(date: Date | string, includeTime: boolean = false): string {
  const formatString = includeTime ? 'MMM dd, yyyy HH:mm' : 'MMM dd, yyyy';
  return formatDate(date, formatString);
}

/**
 * Format date as short format
 */
export function formatShort(date: Date | string): string {
  return formatDate(date, 'MM/dd/yyyy');
}

/**
 * Format date as long format
 */
export function formatLong(date: Date | string): string {
  return formatDate(date, 'EEEE, MMMM do, yyyy');
}

/**
 * Format time only
 */
export function formatTime(date: Date | string, use24Hour: boolean = false): string {
  const formatString = use24Hour ? 'HH:mm:ss' : 'hh:mm:ss a';
  return formatDate(date, formatString);
}

/**
 * Format duration in ms to human readable
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

  return parts.join(' ') || '0s';
}

/**
 * Parse date string safely
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Get timestamp
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Get Unix timestamp (seconds)
 */
export function getUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}