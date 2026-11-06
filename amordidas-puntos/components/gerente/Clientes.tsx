"use client";
import { useCallback, useEffect, useState } from "react";
import Notice, { type NoticeT } from "../Notice";
import WhatsAppIcon from "../WhatsAppIcon";
import { rpc } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";
import { customerLink } from "@/lib/config";
import { msgBienvenida, msgSaldo } from "@/lib/messages";
import { nextReward, phoneFmt, pts } from "@/lib/format";
import type { CustomerRow, Reward } from "@/lib/types";

export default function Clientes({ rewards }: { rewards: Reward[] }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [notice, setNotice] = useState<NoticeT>(null);
  const [created, setCreated] = useState<{ name: string; phone: string; token: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await rpc<CustomerRow[]>("list_customers", { p_search: q.trim() }));
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <NewCustomer
        onCreated={(c) => {
          setCreated(c);
          load();
        }}
      />
      {created && (
        <section className="card mt-4 border-verde/50 bg-verde/5">
          <p className="font-semibold">✅ {created.name} quedó dado de alta.</p>
          <p className="mt-1 break-all text-sm text-morado/70">{customerLink(created.token)}</p>
          <a
            className="btn-wa mt-3 w-full"
            href={waLink(created.phone, msgBienvenida(created.name, created.token))}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon /> Enviar link por WhatsApp
          </a>
          <button className="mt-2 w-full text-sm text-morado/60 underline" onClick={() => setCreated(null)}>
            Cerrar
          </button>
        </section>
      )}

      <section className="card mt-4">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <input
          className="field mt-3"
          placeholder="Buscar por nombre o WhatsApp"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar clientes"
        />
        <Notice notice={notice} />
        {rows && rows.length === 0 && <p className="mt-3 text-morado/60">No hay clientes con esa búsqueda.</p>}
        <ul className="mt-3 space-y-3">
          {rows?.map((c) =>
            editing === c.id ? (
              <EditCustomer
                key={c.id}
                c={c}
                onClose={(changed) => {
                  setEditing(null);
                  if (changed) load();
                }}
              />
            ) : (
              <CustomerItem key={c.id} c={c} rewards={rewards} onEdit={() => setEditing(c.id)} onChanged={load} />
            ),
          )}
        </ul>
      </section>
    </>
  );
}

function CustomerItem({
  c,
  rewards,
  onEdit,
  onChanged,
}: {
  c: CustomerRow;
  rewards: Reward[];
  onEdit: () => void;
  onChanged: () => void;
}) {
  const next = nextReward(c.balance, rewards);
  const [notice, setNotice] = useState<NoticeT>(null);
  const [token, setToken] = useState(c.public_token);

  async function rotate() {
    if (!confirm(`¿Generar un link nuevo para ${c.name}? El link anterior dejará de funcionar.`)) return;
    try {
      const t = await rpc<string>("rotate_customer_token", { p_id: c.id });
      setToken(t);
      setNotice({ kind: "ok", text: "Link nuevo generado. Mándaselo por WhatsApp." });
      onChanged();
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(customerLink(token));
      setNotice({ kind: "ok", text: "Link copiado." });
    } catch {
      setNotice({ kind: "warn", text: customerLink(token) });
    }
  }

  return (
    <li className={`rounded-2xl border-[3px] p-3 ${c.active ? "border-morado/10" : "border-dashed border-morado/20 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {c.name} {!c.active && <span className="text-xs font-bold uppercase text-fresa">Inactivo</span>}
          </p>
          <p className="text-sm text-morado/70">{phoneFmt(c.phone)}</p>
          {c.notes && <p className="text-xs text-morado/60">📝 {c.notes}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-verde">{pts(c.week_earned)} pts</p>
          <p className="text-xs text-morado/60">
            {c.balance !== c.week_earned ? `Disp. ${pts(c.balance)} · ` : ""}
            {next ? `${next.name}: faltan ${pts(next.faltan)}` : "¡Todos los premios! 🎉"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {token && c.active && (
          <a className="btn-wa btn-sm" href={waLink(c.phone, msgSaldo(c, token, rewards))} target="_blank" rel="noreferrer">
            <WhatsAppIcon className="h-4 w-4" /> Mandar saldo
          </a>
        )}
        {token && c.active && (
          <a className="btn-blanco btn-sm" href={waLink(c.phone, msgBienvenida(c.name, token))} target="_blank" rel="noreferrer">
            Reenviar link
          </a>
        )}
        <button className="btn-blanco btn-sm" onClick={copy}>
          Copiar link
        </button>
        <button className="btn-blanco btn-sm" onClick={onEdit}>
          Editar
        </button>
        <button className="btn-blanco btn-sm" onClick={rotate}>
          Generar link nuevo
        </button>
      </div>
      <Notice notice={notice} />
    </li>
  );
}

function NewCustomer({ onCreated }: { onCreated: (c: { name: string; phone: string; token: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const r = await rpc<{ id: string; token: string }>("create_customer", {
        p_name: name,
        p_phone: phone,
        p_notes: notes.trim() || null,
      });
      onCreated({ name: name.trim(), phone, token: r.token });
      setName("");
      setPhone("");
      setNotes("");
      setOpen(false);
    } catch (err) {
      setNotice({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button className="btn-rosa mt-4 w-full" onClick={() => setOpen(true)}>
        ＋ Nuevo cliente
      </button>
    );

  return (
    <form onSubmit={submit} className="card mt-4 space-y-3">
      <h2 className="text-xl font-semibold">Nuevo cliente</h2>
      <div>
        <label className="label" htmlFor="nc-name">Nombre</label>
        <input id="nc-name" className="field" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="nc-phone">WhatsApp (10 dígitos)</label>
        <input id="nc-phone" className="field" type="tel" inputMode="numeric" required placeholder="55 1234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="nc-notes">Notas (opcional)</label>
        <input id="nc-notes" className="field" placeholder="Dirección, referencias…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-blanco" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button className="btn-rosa flex-1" disabled={busy}>
          Dar de alta
        </button>
      </div>
      <Notice notice={notice} />
    </form>
  );
}

function EditCustomer({ c, onClose }: { c: CustomerRow; onClose: (changed: boolean) => void }) {
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone);
  const [notes, setNotes] = useState(c.notes ?? "");
  const [active, setActive] = useState(c.active);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await rpc("update_customer", {
        p_id: c.id,
        p_name: name,
        p_phone: phone,
        p_notes: notes.trim() || null,
        p_active: active,
      });
      onClose(true);
    } catch (err) {
      setNotice({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border-[3px] border-rosa/40 bg-rosa-claro/40 p-3">
      <form onSubmit={submit} className="space-y-2">
        <input className="field" aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" aria-label="WhatsApp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" aria-label="Notas" placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" className="h-5 w-5 accent-rosa" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activo (si lo desactivas, su link deja de funcionar)
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-blanco" onClick={() => onClose(false)}>
            Cancelar
          </button>
          <button className="btn-rosa flex-1" disabled={busy}>
            Guardar
          </button>
        </div>
        <Notice notice={notice} />
      </form>
    </li>
  );
}
