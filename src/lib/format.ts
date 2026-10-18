const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "12m ago", "5h ago", "3d ago". */
export function timeAgo(time: number, now = Date.now()) {
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

/** Magnitudes always show one decimal: "M 6.0", never "M 6". */
export const formatMag = (mag: number) => `M ${mag.toFixed(1)}`;
