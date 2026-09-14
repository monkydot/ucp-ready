export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const CALENDAR_VERSION_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * UCP versions services/capabilities/handlers with calendar versioning
 * ("Format: YYYY-MM-DD"). Validates both the shape and that it is a real
 * calendar date (rejects e.g. "2026-02-30").
 */
export function isCalendarVersion(value: unknown): value is string {
  const match = typeof value === 'string' ? CALENDAR_VERSION_RE.exec(value) : null;
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
