"use client";
import { useState } from "react";
import CustomerPicker from "../CustomerPicker";
import Notice, { type NoticeT } from "../Notice";
import { rpc } from "@/lib/supabase";
import type { CustomerRow } from "@/lib/types";

export default function Ajuste() {
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setBusy(true);
    setNotice(null);
    try {
      await rpc("manual_adjust", { p_customer: customer.id, p_points: Number(points), p_reason: reason });
      setNotice({ kind: "ok", text: `✅ Ajuste de ${Number(points) > 0 ? "+" : ""}${points} pts aplicado a ${customer.name}.` });
      setCustomer(null);
      setPoints("");
      setReason("");
    } catch (err) {
      setNotice({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mt-4 space-y-3">
      <h2 className="text-xl font-semibold">✏️ Ajuste manual</h2>
      <p className="text-sm text-morado/70">Máximo ±300 pts. Queda registrado en el historial y genera una alerta.</p>
      <CustomerPicker value={customer} onChange={setCustomer} />
      <div>
        <label className="label" htmlFor="aj-pts">Puntos (usa – para restar)</label>
        <input id="aj-pts" className="field" type="number" inputMode="numeric" step="1" min="-300" max="300" required value={points} onChange={(e) => setPoints(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="aj-reason">Motivo (obligatorio)</label>
        <input id="aj-reason" className="field" required minLength={8} placeholder="Ej. Compensación por pedido tardío" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button className="btn-rosa w-full" disabled={!customer || busy}>
        Aplicar ajuste
      </button>
      <Notice notice={notice} />
    </form>
  );
}
