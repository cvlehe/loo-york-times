export type AccessibilityCategory = "fully" | "partially" | "not";

type TimeRange = { start: number; end: number };

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const newYorkClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

function parseTime(hourText: string, minuteText: string | undefined, meridiem: string) {
  const hour = Number(hourText);
  const minute = Number(minuteText ?? "0");
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return (hour % 12) * 60 + minute + (meridiem.toLowerCase() === "pm" ? 720 : 0);
}

function parseRange(text: string): TimeRange | null {
  const normalized = text.replace(/[–—]/g, "-").trim();
  const match = normalized.match(/^(?:everyday\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\s+daily|,\s*open later seasonally)?$/i);
  if (!match) return null;

  const start = parseTime(match[1], match[2], match[3]);
  const end = parseTime(match[4], match[5], match[6]);
  if (start === null || end === null || start === end) return null;
  // A late-night start with a daytime end is usually a source-data typo.
  if (start >= 20 * 60 && end >= 12 * 60 && end < start) return null;
  return { start, end: end < start ? end + 1440 : end };
}

function newYorkDayAndMinute(now: Date) {
  const parts = newYorkClock.formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: weekdays.indexOf(value("weekday")),
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function isOpenAt(restroom: {
  hours_text: string | null;
  source_status: string | null;
  source_availability: string | null;
}, now: Date) {
  if (restroom.source_status?.trim().toLowerCase() !== "operational") return false;
  if (restroom.source_availability?.trim().toLowerCase() !== "year round") return false;

  const hours = restroom.hours_text?.trim();
  if (!hours) return false;
  if (/^(?:24\s*hours?|24\/7)$/i.test(hours)) return true;

  const { day, minute } = newYorkDayAndMinute(now);
  const lines = hours.replace(/\r/g, "").split("\n");
  const schedule = new Map<number, TimeRange | null>();
  for (const line of lines) {
    const match = line.trim().match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*:?\s*(.+)$/i);
    if (!match) continue;
    const index = weekdays.findIndex((weekday) => weekday.toLowerCase() === match[1].toLowerCase());
    schedule.set(index, /^closed$/i.test(match[2].trim()) ? null : parseRange(match[2]));
  }

  if (schedule.size > 0) {
    const today = schedule.get(day);
    const yesterday = schedule.get((day + 6) % 7);
    return Boolean(
      (today && minute >= today.start && minute < today.end) ||
      (yesterday && yesterday.end > 1440 && minute < yesterday.end - 1440),
    );
  }

  const daily = parseRange(hours);
  return Boolean(daily && (minute >= daily.start || (daily.end > 1440 && minute < daily.end - 1440)) && minute < daily.end);
}

export function accessibilityCategory(source: string | null): AccessibilityCategory | null {
  const value = source?.trim().toLowerCase();
  if (value === "fully accessible") return "fully";
  if (value === "partially accessible" || value === "limited accessibility") return "partially";
  if (value === "not accessible") return "not";
  return null;
}

export function hasChangingStation(notes: string | null) {
  const value = notes?.trim().replace(/^"|"$/g, "") ?? "";
  return /^yes\b/i.test(value) || /\bchanging (?:station|table) (?:is )?available\b/i.test(value);
}
