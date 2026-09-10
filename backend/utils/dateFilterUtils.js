import { Op } from 'sequelize';

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * Helper to extract year, month, day in a specific timezone
 */
export function getZonedDateParts(date, timeZone = BUSINESS_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10)
  };
}

/**
 * Helper to construct a UTC Date object representing a specific local date/time in the target timezone.
 */
export function zonedDateTimeToUtc(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0, timeZone = BUSINESS_TIMEZONE) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(utcGuess);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let tzHour = parseInt(map.hour, 10);
  if (tzHour === 24) tzHour = 0;
  const tzAsUtc = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    tzHour,
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );
  const offsetMs = tzAsUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

/**
 * Validates a YYYY-MM-DD date string.
 * Rejects invalid format, invalid calendar dates (e.g. Feb 30), and impossible dates.
 */
export function validateCalendarDate(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Verify calendar validity (handles leap years, 30-day months, etc.)
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day };
}

/**
 * Computes exact start (inclusive) and end (exclusive) boundaries in UTC for the given dateFilter.
 * All calendar boundaries are computed against BUSINESS_TIMEZONE (Asia/Kolkata).
 * 
 * Exact semantics:
 * - last_7_days: Today + previous 6 calendar days. Start at midnight 6 days before today; end at midnight tomorrow, exclusive.
 * - this_month: 1st of current month 00:00 to 1st of next month 00:00, exclusive.
 * - last_month: 1st of previous month 00:00 to 1st of current month 00:00, exclusive.
 * - custom: startDate 00:00 to midnight after endDate 00:00 (endDate + 1 day 00:00), exclusive.
 * - overall: returns null (no restriction).
 */
export function computeDateBoundaries(dateFilter, startDate, endDate, referenceDate = new Date(), timeZone = BUSINESS_TIMEZONE) {
  if (!dateFilter || dateFilter === 'overall') return null;

  const parts = getZonedDateParts(referenceDate, timeZone);

  if (dateFilter === 'last_7_days') {
    // 6 days before today at 00:00:00
    const start = zonedDateTimeToUtc(parts.year, parts.month, parts.day - 6, 0, 0, 0, 0, timeZone);
    // Tomorrow at 00:00:00 (exclusive)
    const end = zonedDateTimeToUtc(parts.year, parts.month, parts.day + 1, 0, 0, 0, 0, timeZone);
    return { start, end };
  }

  if (dateFilter === 'this_month') {
    const start = zonedDateTimeToUtc(parts.year, parts.month, 1, 0, 0, 0, 0, timeZone);
    const end = zonedDateTimeToUtc(parts.year, parts.month + 1, 1, 0, 0, 0, 0, timeZone);
    return { start, end };
  }

  if (dateFilter === 'last_month') {
    const start = zonedDateTimeToUtc(parts.year, parts.month - 1, 1, 0, 0, 0, 0, timeZone);
    const end = zonedDateTimeToUtc(parts.year, parts.month, 1, 0, 0, 0, 0, timeZone);
    return { start, end };
  }

  if (dateFilter === 'custom') {
    const sParsed = validateCalendarDate(startDate);
    const eParsed = validateCalendarDate(endDate);

    if (!sParsed || !eParsed) {
      const err = new Error('Both startDate and endDate are required in YYYY-MM-DD format for custom date filter.');
      err.statusCode = 400;
      throw err;
    }

    const start = zonedDateTimeToUtc(sParsed.year, sParsed.month, sParsed.day, 0, 0, 0, 0, timeZone);
    const end = zonedDateTimeToUtc(eParsed.year, eParsed.month, eParsed.day + 1, 0, 0, 0, 0, timeZone);

    if (start.getTime() >= end.getTime() || (sParsed.year > eParsed.year || (sParsed.year === eParsed.year && sParsed.month > eParsed.month) || (sParsed.year === eParsed.year && sParsed.month === eParsed.month && sParsed.day > eParsed.day))) {
      const err = new Error('startDate cannot be later than endDate.');
      err.statusCode = 400;
      throw err;
    }

    return { start, end };
  }

  return null;
}

/**
 * Builds Sequelize date filter condition with:
 * - submittedAt when not null
 * - createdAt fallback when submittedAt is null
 * - inclusive lower bound: timestamp >= start
 * - exclusive upper bound: timestamp < end
 */
export function buildDateFilterClause(dateFilter, startDate, endDate, referenceDate = new Date(), timeZone = BUSINESS_TIMEZONE) {
  const boundaries = computeDateBoundaries(dateFilter, startDate, endDate, referenceDate, timeZone);
  if (!boundaries) return null;

  const { start, end } = boundaries;
  const dateCond = {
    [Op.gte]: start,
    [Op.lt]: end
  };

  return {
    [Op.or]: [
      { submittedAt: dateCond },
      {
        [Op.and]: [
          { submittedAt: null },
          { createdAt: dateCond }
        ]
      }
    ]
  };
}
