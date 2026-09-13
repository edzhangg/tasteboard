/** One decimal, or an em dash when there is no score. */
export function fmtScore(n: number | null | undefined): string {
  return n == null ? "—" : n.toFixed(1);
}

/** "Mar 14, 2026" */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jul 2" — the short form used on board cards. */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // Local date, not UTC — a visit logged at 9pm belongs to today, not tomorrow.
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function pluralPlaces(n: number): string {
  return `${n} ${n === 1 ? "place" : "places"}`;
}
