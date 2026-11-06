"use client";
import { useCallback, useEffect, useState } from "react";
import CustomerPicker from "../CustomerPicker";
import Notice, { type NoticeT } from "../Notice";
import WhatsAppIcon from "../WhatsAppIcon";
import { rpc } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";
import { msgPedido } from "@/lib/messages";
import { dateTime, money } from "@/lib/format";
import type { CustomerRow, OrderRow } from "@/lib/types";

const STATUS: Record<OrderRow["status"], { label: string; cls: string }> = {
  en_camino: { label: "En camino", cls: "bg-azul/10 text-azul" },
  entregado: { label: "Entregado", cls: "bg-verde/15 text-[#2f6e12]" },
  bloqueado: { label: "Bloqueado", cls: "bg-fresa/10 text-fresa" },
  cancelado: { label: "Cancelado", cls: "bg-morado/10 text-morado/60" },
};

export default function Pedidos() {
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [amount, setAmount] = useState("");
  const [driver, setDriver] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(null);
  const [created, setCreated] = useState<{ folio: string; c: CustomerRow } | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await rpc<OrderRow[]>("manager_orders", { p_status: null }));
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    rpc<{ id: string; name: string }[]>("list_drivers")
      .then((d) => {
        setDrivers(d);
        if (d.length === 1) setDriver(d[0].id);
      })
      .catch((e) => setNotice({ kind: "error", text: e.message }));
    loadOrders();
    const id = setInterval(loadOrders, 15000);
    return () => clearInterval(id);
  }, [loadOrders]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await rpc<{ id: string; folio: string }>("create_order", {
        p_customer: customer.id,
        p_amount: Number(amount),
        p_driver: driver,
      });
      setCreated({ folio: r.folio, c: customer });
      setCustomer(null);
      setAmount("");
      loadOrders();
    } catch (err) {
      setNotice({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(o: OrderRow) {
    if (!confirm(`¿Cancelar el pedido ${o.folio} de ${o.customer_name}? No dará puntos.`)) return;
    try {
      await rpc("cancel_order", { p_order: o.id });
      loadOrders();
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    }
  }

  return (
    <>
      <form onSubmit={submit} className="card mt-4 space-y-3">
        <h2 className="text-xl font-semibold">🛵 Nuevo pedido</h2>
        <div>
          <p className="label">Cliente</p>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </div>
        <div>
          <label className="label" htmlFor="np-amount">Monto ($)</label>
          <input id="np-amount" className="field" type="number" inputMode="decimal" min="1" max="19999" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          {Number(amount) > 0 && <p className="mt-1 text-sm text-morado/60">Ganará {Math.floor(Number(amount))} pts al entregarse.</p>}
        </div>
        <div>
          <label className="label" htmlFor="np-driver">Repartidor</label>
          <select id="np-driver" className="field" required value={driver} onChange={(e) => setDriver(e.target.value)}>
            <option value="">Elige…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {drivers.length === 0 && <p className="mt-1 text-sm text-fresa">No hay repartidores activos. Dalos de alta en Supabase (ver README).</p>}
        </div>
        <button className="btn-rosa w-full" disabled={!customer || !driver || busy}>
          Crear pedido
        </button>
        <Notice notice={notice} />
      </form>

      {created && (
        <section className="card mt-4 border-verde/50 bg-verde/5">
          <p className="font-semibold">✅ Pedido {created.folio} creado para {created.c.name}.</p>
          <p className="mt-1 text-sm text-morado/70">El código de entrega solo lo ve el cliente en su link.</p>
          {created.c.public_token && (
            <a className="btn-wa mt-3 w-full" href={waLink(created.c.phone, msgPedido(created.folio, created.c.public_token))} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> Avisar por WhatsApp
            </a>
          )}
          <button className="mt-2 w-full text-sm text-morado/60 underline" onClick={() => setCreated(null)}>
            Cerrar
          </button>
        </section>
      )}

      <section className="card mt-4">
        <h2 className="text-xl font-semibold">Pedidos recientes</h2>
        {orders && orders.length === 0 && <p className="mt-2 text-morado/60">Aún no hay pedidos.</p>}
        <ul className="mt-2 divide-y-2 divide-morado/5">
          {orders?.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium">
                  <span className="mr-2 font-mono text-sm">{o.folio}</span>
                  {o.customer_name}
                </p>
                <p className="text-xs text-morado/60">
                  {money(o.amount)} · {o.driver_name} · {dateTime(o.created_at)}
                  {o.attempts > 0 && ` · ${o.attempts} intento(s) fallido(s)`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                {(o.status === "en_camino" || o.status === "bloqueado") && (
                  <button className="text-xs text-fresa underline" onClick={() => cancel(o)}>
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
