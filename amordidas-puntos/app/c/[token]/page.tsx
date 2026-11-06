"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { supabase } from "@/lib/supabase";
import { waNegocio } from "@/lib/whatsapp";
import { dateTime, money, pts, timeLeft } from "@/lib/format";
import type { CustomerView } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "ok"; data: CustomerView; fetchedAt: number };

export default function CustomerPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data, error } = await supabase().rpc("customer_view", { p_token: token });
      if (error) throw error;
      setOffline(false);
      if (!data) setState({ kind: "invalid" });
      else setState({ kind: "ok", data: data as CustomerView, fetchedAt: Date.now() });
    } catch {
      setOffline(true);
      setState((s) => (s.kind === "loading" ? { kind: "invalid" } : s));
    } finally {
      inFlight.current = false;
    }
  }, [token]);

  // Carga inicial
  useEffect(() => {
    load();
  }, [load]);

  // Refresco: 5 s si hay pedido en camino o canje activo; si no, 30 s
  const active =
    state.kind === "ok" && (state.data.orders_en_camino.length > 0 || state.data.redeem !== null);
  useEffect(() => {
    const id = setInterval(load, active ? 5000 : 30000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, active]);

  // Reloj local para la cuenta regresiva y la barra del código de canje
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cuando el código de canje caduca, pedir el nuevo de inmediato
  const redeemLeft =
    state.kind === "ok" && state.data.redeem
      ? state.data.redeem.seconds_left - Math.floor((now - state.fetchedAt) / 1000)
      : null;
  useEffect(() => {
    if (redeemLeft !== null && redeemLeft <= 0) load();
  }, [redeemLeft, load]);

  if (state.kind === "loading") {
    return (
      <Shell>
        <p className="py-20 text-center text-lg text-morado/60">Cargando tus puntos…</p>
      </Shell>
    );
  }

  if (state.kind === "invalid") {
    return (
      <Shell>
        <div className="card mt-6 text-center">
          <p className="text-5xl">🍓</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {offline ? "No pudimos cargar tus puntos" : "Este link no es válido"}
          </h1>
          <p className="mt-2 text-morado/70">
            {offline ? "Revisa tu conexión e intenta de nuevo." : "Pide uno nuevo por WhatsApp."}
          </p>
          {offline && (
            <button className="btn-blanco mt-4 w-full" onClick={() => location.reload()}>
              Reintentar
            </button>
          )}
        </div>
        <a className="btn-wa mt-4 w-full" href={waNegocio("Hola Amordidas, mi link de puntos no funciona, ¿me mandan uno nuevo? 🍓")}>
          <WhatsAppIcon /> Pedir link por WhatsApp
        </a>
      </Shell>
    );
  }

  const d = state.data;
  const resetMs = new Date(d.week_resets_at).getTime() - now;
  const soon = resetMs <= 2 * 24 * 3600 * 1000;
  const rewards = [...d.rewards].sort((a, b) => a.cost - b.cost);
  const next = rewards.find((r) => r.faltan > 0);
  const maxCost = rewards.length ? rewards[rewards.length - 1].cost : 1;
  const fill = Math.min(100, (Math.max(0, d.balance) / maxCost) * 100);
  const vigencia = 30;

  return (
    <Shell>
      {offline && (
        <p className="mb-3 rounded-2xl bg-fresa/10 px-4 py-2 text-center text-sm text-fresa">
          Sin conexión. Mostrando lo último que cargamos.
        </p>
      )}

      <h1 className="text-center text-2xl font-semibold">Hola, {d.name} 👋</h1>

      {/* Contador principal */}
      <section className="mt-4 rounded-[24px] border-[3px] border-morado/15 bg-verde p-6 text-center text-white shadow-[0_6px_0_#3f8a1c]">
        <p className="text-lg font-medium">Llevas</p>
        <p className="text-7xl font-bold leading-none tracking-tight" data-testid="week-earned">
          {pts(d.week_earned)}
        </p>
        <p className="mt-1 text-lg font-medium">puntos esta semana</p>
        {d.balance !== d.week_earned && (
          <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-base" data-testid="balance">
            Disponibles: <b>{pts(d.balance)}</b>
          </p>
        )}
      </section>

      <p
        className={`mt-3 rounded-2xl px-4 py-2 text-center font-medium ${
          soon ? "bg-amarillo text-morado" : "bg-white text-morado/70"
        }`}
      >
        ⏳ Tus puntos se reinician el lunes · faltan {timeLeft(resetMs)}
      </p>

      {/* Pedido en camino */}
      {d.orders_en_camino.map((o) => (
        <section key={o.folio} className="card mt-4 border-azul/40">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🛵 Tu pedido va en camino</h2>
            <span className="rounded-full bg-azul/10 px-3 py-1 text-sm font-semibold text-azul">{o.folio}</span>
          </div>
          <p className="mt-1 text-morado/70">
            {money(o.amount)} · ganarás <b>{pts(o.points)} pts</b>
          </p>
          <p className="mt-3 text-center text-sm font-medium text-morado/70">Código de entrega</p>
          <p className="code text-center text-6xl font-bold text-azul" data-testid="delivery-code">
            {o.delivery_code}
          </p>
          <p className="mt-2 text-center text-sm font-medium">
            Dáselo al repartidor solo cuando recibas tu pedido.
          </p>
        </section>
      ))}

      {/* Canje activo */}
      {d.redeem && (
        <section className="card mt-4 border-rosa/60">
          <h2 className="text-lg font-semibold">🎁 Canje de {d.redeem.reward}</h2>
          <p className="code mt-2 text-center text-5xl font-bold text-rosa" data-testid="redeem-code">
            {d.redeem.code}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-rosa-claro">
            <div
              className="h-full rounded-full bg-rosa transition-[width] duration-1000 ease-linear"
              style={{ width: `${(Math.max(0, redeemLeft ?? 0) / vigencia) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm font-medium">
            Muéstraselo a quien te entrega el premio · cambia en {Math.max(0, redeemLeft ?? 0)} s
          </p>
        </section>
      )}

      {/* Escalera de premios */}
      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Premios de la semana</h2>
        <div className="relative mt-4 mb-2 h-4 rounded-full bg-rosa-claro">
          <div className="h-full rounded-full bg-rosa transition-[width]" style={{ width: `${fill}%` }} />
          {rewards.map((r) => (
            <span
              key={r.id}
              className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] ${
                r.faltan === 0 ? "border-white bg-verde" : "border-rosa bg-white"
              }`}
              style={{ left: `${Math.min(97, Math.max(3, (r.cost / maxCost) * 100))}%` }}
              aria-hidden
            />
          ))}
        </div>
        <ul className="mt-4 space-y-2">
          {rewards.map((r) => {
            const isNext = next?.id === r.id;
            return (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border-[3px] px-3 py-2 ${
                  r.faltan === 0
                    ? "border-verde/40 bg-verde/10"
                    : isNext
                      ? "border-amarillo bg-amarillo/25"
                      : "border-transparent bg-fondo"
                }`}
              >
                <div>
                  <p className="font-semibold">
                    {r.name} {isNext && <span className="ml-1 text-xs font-bold uppercase text-rosa">Siguiente</span>}
                  </p>
                  <p className="text-sm text-morado/60">{pts(r.cost)} pts</p>
                </div>
                <p className="text-right text-sm">
                  {r.faltan === 0 ? (
                    <span className="font-semibold text-verde">
                      ¡Ya lo tienes! 🎉
                      <br />
                      <span className="font-normal text-morado/70">Pídelo al hacer tu pedido</span>
                    </span>
                  ) : (
                    <>
                      Te faltan <b className="text-base">{pts(r.faltan)}</b> pts
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-center text-xs text-morado/60">
          1 punto por cada $1 · El contador se reinicia cada lunes
        </p>
      </section>

      {/* Historial */}
      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Esta semana</h2>
        {d.ledger.length === 0 ? (
          <p className="mt-2 text-morado/60">Todavía no tienes movimientos esta semana. ¡Pide algo rico! 🍓</p>
        ) : (
          <ul className="mt-2 divide-y-2 divide-morado/5">
            {d.ledger.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{l.detail}</p>
                  <p className="text-xs text-morado/60">{dateTime(l.at)}</p>
                </div>
                <span className={`font-semibold ${l.points < 0 ? "text-fresa" : "text-verde"}`}>
                  {l.points > 0 ? "+" : ""}
                  {pts(l.points)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a
        className="btn-wa mt-6 w-full text-lg"
        href={waNegocio(`Hola Amordidas, soy ${d.name}, quiero hacer un pedido 🍓`)}
      >
        <WhatsAppIcon /> Pedir por WhatsApp
      </a>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 pt-4 pb-8">
      <div className="flex justify-center">
        <Logo className="w-36" />
      </div>
      {children}
    </main>
  );
}
