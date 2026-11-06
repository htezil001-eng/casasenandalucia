import { WHATSAPP_NEGOCIO } from "./config";

/** Normaliza a 52 + 10 dígitos. Acepta "5512345678", "52 55 1234 5678", "+52…". */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `52${d}`;
  return d;
}

/** Enlace gratuito de WhatsApp (wa.me) con mensaje prellenado. */
export function waLink(phone: string, text?: string): string {
  const base = `https://wa.me/${waNumber(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function waNegocio(text: string): string {
  return `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(text)}`;
}
