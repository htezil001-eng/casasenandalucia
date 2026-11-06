/** URL pública de la app, sin "/" al final. */
export function appUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function customerLink(token: string): string {
  return `${appUrl()}/c/${token}`;
}

/** WhatsApp del negocio: 52 + 10 dígitos. */
export const WHATSAPP_NEGOCIO = (process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO ?? "").replace(/\D/g, "");
