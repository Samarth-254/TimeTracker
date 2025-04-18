import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const INDIAN_TIMEZONE = "Asia/Kolkata";

// Format date in Indian timezone
export function formatDateInIndianTimezone(date, formatStr = "yyyy-MM-dd HH:mm:ss") {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(dateObj, INDIAN_TIMEZONE, formatStr);
}

// Format time difference in a human-readable format (HH:mm)
export function formatTimeDifference(startTime, endTime) {
  if (!startTime || !endTime) return "00:00";

  const start = new Date(startTime);
  const end = new Date(endTime);

  const diffInMs = end.getTime() - start.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Converts decimal hours to hh:mm:ss format
export function formatHoursToHMS(decimalHours) {
  if (isNaN(decimalHours) || decimalHours === null) return '00:00:00';
  const totalSeconds = Math.round(decimalHours * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(unit => String(unit).padStart(2, '0'))
    .join(':');
}