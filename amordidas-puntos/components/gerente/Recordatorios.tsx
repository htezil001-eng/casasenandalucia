"use client";
import { useEffect, useState } from "react";
import Notice, { type NoticeT } from "../Notice";
import WhatsAppIcon from "../WhatsAppIcon";
import { rpc } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";
import { msgSaldo } from "@/lib/messages";
import { nextReward, phoneFmt, pts } from "@/lib/format";
import type { CustomerRow, Reward } from "@/lib/types";

const UMBRAL = 150;

export default function Recordatorios({ rewards }: { rewards: Reward[] }) {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [notice, setNotice] = useState<NoticeT>(null);

  useEffect(() => {
    rpc<CustomerRow[]>("list_customers", { p_search: "" })
      .then(setRows)
      .catch((e) => setNotice({ kind: "error", text: e.message }));
  }, []);

  const cerca = (rows ?? [])
    .filter((c) => c.active && c.public_token)
    .map((c) => ({ c, next: nextReward(c.balance, rewards) }))
    .filter((x) => x.next && x.next.faltan <= UMBRAL)
    .sort((a, b) => a.next!.faltan - b.next!.faltan);

  return (
    <section className="card mt-4">
      <h2 className="text-xl font-semibold">📣 Recordatorios de fin de semana</h2>
      <p className="mt-1 text-sm text-morado/70">
        Clientes a quienes les faltan {UMBRAL} pts o menos para su siguiente premio. Mándales un mensaje el sábado o
        domingo, antes de que se reinicien los puntos.
      </p>
      <Notice notice={notice} />
      {rows && cerca.length === 0 && <p className="mt-3 text-morado/60">Nadie está cerca de un premio por ahora.</p>}
      <ul className="mt-3 space-y-2">
        {cerca.map(({ c, next }) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-amarillo/20 px-3 py-2">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-morado/70">
                {phoneFmt(c.phone)} · {pts(c.week_earned)} pts · faltan <b>{pts(next!.faltan)}</b> para {next!.name}
              </p>
            </div>
            <a className="btn-wa btn-sm shrink-0" href={waLink(c.phone, msgSaldo(c, c.public_token!, rewards))} target="_blank" rel="noreferrer">
              <WhatsAppIcon className="h-4 w-4" /> Avisar
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
