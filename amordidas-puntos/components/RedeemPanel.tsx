"use client";
import { useEffect, useState } from "react";
import CustomerPicker from "./CustomerPicker";
import Notice, { type NoticeT } from "./Notice";
import { rpc } from "@/lib/supabase";
import { pts } from "@/lib/format";
import type { CustomerRow, Reward } from "@/lib/types";

/** Canje: buscar cliente → elegir premio (start_redeem) → capturar código (confirm_redeem). */
export default function RedeemPanel({ onDone }: { onDone?: () => void }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [started, setStarted] = useState<Reward | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(null);

  useEffect(() => {
    rpc<Reward[]>("list_rewards").then(setRewards).catch((e) => setNotice({ kind: "error", text: e.message }));
  }, []);

  function reset(c: CustomerRow | null) {
    setCustomer(c);
    setStarted(null);
    setCode("");
  }

  async function start(r: Reward) {
    if (!customer) return;
    setBusy(true);
    setNotice(null);
    try {
      await rpc("start_redeem", { p_customer: customer.id, p_reward: r.id });
      setStarted(r);
      setNotice({ kind: "warn", text: `Pídele a ${customer.name} que abra su link y te dicte el código de 6 caracteres.` });
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setBusy(true);
    try {
      const res = await rpc<{ ok: boolean; reward?: string; error?: string; blocked?: boolean }>("confirm_redeem", {
        p_customer: customer.id,
        p_code: code,
      });
      if (res.ok) {
        setNotice({ kind: "ok", text: `✅ Canje confirmado: ${res.reward} para ${customer.name}.` });
        reset(null);
        onDone?.();
      } else {
        setNotice({ kind: "error", text: res.error ?? "Código inválido" });
        setCode("");
        if (res.blocked) setStarted(null);
      }
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4">
      <h2 className="text-xl font-semibold">🎁 Canjear premio</h2>
      <div className="mt-3">
        <CustomerPicker value={customer} onChange={reset} />
      </div>

      {customer && !started && (
        <div className="mt-4 grid gap-2">
          <p className="label">Elige el premio</p>
          {rewards.map((r) => {
            const ok = customer.balance >= r.cost;
            return (
              <button key={r.id} className="btn-blanco justify-between" disabled={!ok || busy} onClick={() => start(r)}>
                <span>{r.name}</span>
                <span className={ok ? "text-verde" : "text-morado/50"}>{pts(r.cost)} pts</span>
              </button>
            );
          })}
        </div>
      )}

      {customer && started && (
        <form onSubmit={confirm} className="mt-4">
          <label className="label" htmlFor="redeem-code">
            Código que te dicta el cliente ({started.name})
          </label>
          <input
            id="redeem-code"
            className="field code text-center text-2xl uppercase"
            inputMode="text"
            autoComplete="off"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
          <div className="mt-3 flex gap-2">
            <button className="btn-blanco" type="button" onClick={() => reset(customer)}>
              Atrás
            </button>
            <button className="btn-rosa flex-1" disabled={code.length !== 6 || busy}>
              Confirmar canje
            </button>
          </div>
          <p className="mt-2 text-xs text-morado/60">El canje caduca en 5 minutos. El código cambia cada 30 s.</p>
        </form>
      )}

      <Notice notice={notice} />
    </section>
  );
}
