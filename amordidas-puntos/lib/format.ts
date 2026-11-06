import type { Reward } from "./types";

const TZ = "America/Mexico_City";

export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(n);

export const pts = (n: number) => new Intl.NumberFormat("es-MX").format(n);

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const phoneFmt = (p: string) => (p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 6)} ${p.slice(6)}` : p);

/** "2 días 5 h", "5 h 12 min", "12 min". */
export function timeLeft(ms: number): string {
  if (ms <= 0) return "0 min";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} ${d === 1 ? "día" : "días"} ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

/** Siguiente premio por alcanzar con el saldo disponible (o null si ya tiene todos). */
export function nextReward(balance: number, rewards: Reward[]): (Reward & { faltan: number }) | null {
  const r = [...rewards].sort((a, b) => a.cost - b.cost).find((x) => x.cost > balance);
  return r ? { ...r, faltan: r.cost - balance } : null;
}
