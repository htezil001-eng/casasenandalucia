"use client";
import { useCallback, useEffect, useState } from "react";
import StaffHeader from "@/components/StaffHeader";
import Tabs from "@/components/Tabs";
import Notice, { type NoticeT } from "@/components/Notice";
import RedeemPanel from "@/components/RedeemPanel";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useStaff } from "@/components/useStaff";
import { rpc } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";
import { dateTime, money, phoneFmt, pts } from "@/lib/format";
import type { Delivery } from "@/lib/types";

type Tab = "entregas" | "canje";

export default function RepartidorPage() {
  const me = useStaff("repartidor");
  const [tab, setTab] = useState<Tab>("entregas");
  const [list, setList] = useState<Delivery[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setList(await rpc<Delivery[]>("my_deliveries"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [me, load]);

  if (!me) return <p className="py-20 text-center text-morado/60">Cargando…</p>;

  return (
    <main className="mx-auto max-w-md px-4 pt-4 pb-10">
      <StaffHeader me={me} />
      <Tabs<Tab>
        tabs={[
          { id: "entregas", label: "Mis entregas", badge: list?.length },
          { id: "canje", label: "Canjear premio" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "entregas" && (
        <>
          {error && <Notice notice={{ kind: "error", text: error }} />}
          {list && list.length === 0 && (
            <div className="card mt-4 text-center text-morado/70">No tienes entregas pendientes. 🛵</div>
          )}
          {list?.map((d) => <DeliveryCard key={d.id} d={d} onClosed={load} />)}
        </>
      )}
      {tab === "canje" && <RedeemPanel />}
    </main>
  );
}

function DeliveryCard({ d, onClosed }: { d: Delivery; onClosed: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(null);
  const [done, setDone] = useState(false);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await rpc<{ ok: boolean; attempts?: number; max?: number; points?: number; note?: string | null }>(
        "confirm_delivery",
        { p_order: d.id, p_code: code },
      );
      if (r.ok) {
        setDone(true);
        setNotice({
          kind: "ok",
          text: `✅ Entregado. ${d.customer_name} ganó ${pts(r.points ?? 0)} pts${r.note ? ` (${r.note})` : ""}.`,
        });
        setTimeout(onClosed, 4000);
      } else if ((r.attempts ?? 0) >= (r.max ?? 3)) {
        setDone(true);
        setNotice({ kind: "error", text: `Pedido bloqueado: ${r.attempts}/${r.max} códigos incorrectos. Avisa al gerente.` });
        setTimeout(onClosed, 6000);
      } else {
        setNotice({ kind: "error", text: `Código incorrecto · intento ${r.attempts}/${r.max}` });
      }
      setCode("");
    } catch (err) {
      setNotice({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{d.customer_name}</p>
          <p className="text-sm text-morado/70">
            {phoneFmt(d.phone)} · {dateTime(d.created_at)}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-azul/10 px-3 py-1 text-sm font-semibold text-azul">{d.folio}</span>
          <p className="mt-1 font-semibold">{money(d.amount)}</p>
        </div>
      </div>
      <a className="btn-wa btn-sm mt-3 w-full" href={waLink(d.phone, `Hola ${d.customer_name}, soy tu repartidor de Amordidas 🛵🍓`)} target="_blank" rel="noreferrer">
        <WhatsAppIcon /> Abrir WhatsApp del cliente
      </a>
      {!done && (
        <form onSubmit={confirm} className="mt-3 flex gap-2">
          <input
            className="field code w-32 text-center text-2xl"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0000"
            maxLength={4}
            aria-label={`Código de entrega ${d.folio}`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn-rosa flex-1" disabled={code.length !== 4 || busy}>
            Confirmar entrega
          </button>
        </form>
      )}
      <Notice notice={notice} />
    </section>
  );
}
