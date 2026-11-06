"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente de Supabase para el navegador. Solo usa la anon key. */
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
    }
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "amordidas-equipo" },
    });
  }
  return client;
}

/** Llama una RPC y lanza un Error con el mensaje de la base de datos si falla. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}

function friendlyError(msg: string): string {
  if (/JWT|not authorized|permission denied/i.test(msg)) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  if (/customers_phone_check/.test(msg)) return "El WhatsApp debe tener 10 dígitos.";
  if (/customers_name_check/.test(msg)) return "El nombre debe tener entre 2 y 80 letras.";
  if (/customers_phone_key|duplicate key/.test(msg)) return "Ya existe un cliente con ese número.";
  if (/orders_amount_check/.test(msg)) return "El monto debe ser mayor a $0 y menor a $20,000.";
  return msg;
}
