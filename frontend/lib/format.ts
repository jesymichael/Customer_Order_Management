export function money(n: number | string) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function orderNo(n: number) {
  return `#${String(n).padStart(5, "0")}`;
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Time remaining in the 48h edit window. Call on the client (uses now()). */
export function editWindowLeft(createdAtIso: string): string | null {
  const remaining = new Date(createdAtIso).getTime() + EDIT_WINDOW_MS - Date.now();
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / 3_600_000);
  const mins = Math.floor(remaining / 60_000) % 60;
  if (hours >= 1) return `${hours}h ${mins}m left to edit`;
  return `${mins}m left to edit`;
}
