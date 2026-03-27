import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { useTheme } from "next-themes";
import { twMerge } from "tailwind-merge";

export function getLogoUrl() {
  const isDarkMode = useTheme().theme === 'dark';
  return isDarkMode ? '/logo.dark.svg' : '/logo.svg';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseSermonDate(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

export function formatDate(dateStr: string): string {
  const parsed = parseSermonDate(dateStr);
  if (!parsed) {
    return dateStr;
  }

  if (parsed.month === 0) {
    return String(parsed.year);
  }

  if (parsed.day === 0) {
    try {
      return format(
        parseISO(`${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`),
        'MMM yyyy'
      );
    } catch {
      return dateStr;
    }
  }

  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatLongDate(dateStr: string): string {
  const parsed = parseSermonDate(dateStr);
  if (!parsed) {
    return dateStr;
  }

  if (parsed.month === 0) {
    return String(parsed.year);
  }

  if (parsed.day === 0) {
    try {
      return format(
        parseISO(`${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`),
        'MMMM yyyy'
      );
    } catch {
      return dateStr;
    }
  }

  try {
    return format(parseISO(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function extractYear(dateStr: string): number | null {
  if (!dateStr) {
    return null;
  }

  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}
