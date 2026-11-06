"use client";
import { useCallback, useEffect, useState } from "react";
import Notice, { type NoticeT } from "../Notice";
import { rpc } from "@/lib/supabase";
import { dateTime, pts } from "@/lib/format";
import type { Alert, LedgerRow } from "@/lib/types";

const TYPE: Record<string, string> = { compra: "Compra", canje: "Canje", ajuste: "Ajuste", caducidad: "Caducidad" };

export default function Control() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [verify, setVerify] = useState<NoticeT>(null);
  const [notice, setNotice] = useState<NoticeT>(null);

  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([rpc<Alert[]>("manager_alerts"), rpc<LedgerRow[]>("manager_ledger", { p_customer: null })]);
      setAlerts(a);
      setLedger(l);
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function check() {
    try {
      const r = await rpc<{ ok: boolean; broken_at?: number }>("verify_ledger");
      setVerify(
        r.ok
          ? { kind: "ok", text: "✅ El historial está íntegro: nadie lo ha modificado." }
          : { kind: "error", text: `⚠️ El historial fue alterado a partir del movimiento #${r.broken_at}.` },
      );
    } catch (e) {
      setVerify({ kind: "error", text: (e as Error).message });
    }
  }

  return (
    <>
      <Notice notice={notice} />
      <section className="card mt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">🚨 Alertas</h2>
          <button className="btn-blanco btn-sm" onClick={load}>
            Actualizar
          </button>
        </div>
        {alerts && alerts.length === 0 && <p className="mt-2 text-morado/60">Sin alertas. 🎉</p>}
        <ul className="mt-2 space-y-2">
          {alerts?.map((a) => (
            <li key={a.id} className={`rounded-2xl px-3 py-2 ${a.level === "bad" ? "bg-fresa/10 text-fresa" : "bg-amarillo/25"}`}>
              <p className="font-medium">{a.text}</p>
              <p className="text-xs opacity-70">{dateTime(a.created_at)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">📜 Historial completo</h2>
          <button className="btn-azul btn-sm" onClick={check}>
            Verificar historial
          </button>
        </div>
        <Notice notice={verify} />
        {ledger && ledger.length === 0 && <p className="mt-2 text-morado/60">Sin movimientos todavía.</p>}
        <ul className="mt-2 divide-y-2 divide-morado/5">
          {ledger?.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium">
                  {l.customer_name} <span className="text-xs text-morado/60">· {TYPE[l.type] ?? l.type}</span>
                </p>
                <p className="text-xs text-morado/60">
                  #{l.id} · {l.detail} · {l.actor ?? "sistema"} · {dateTime(l.created_at)}
                </p>
              </div>
              <span className={`font-semibold ${l.points < 0 ? "text-fresa" : "text-verde"}`}>
                {l.points > 0 ? "+" : ""}
                {pts(l.points)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
