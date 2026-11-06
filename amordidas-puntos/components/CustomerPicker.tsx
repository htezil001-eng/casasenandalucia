"use client";
import { useEffect, useState } from "react";
import { rpc } from "@/lib/supabase";
import { phoneFmt, pts } from "@/lib/format";
import type { CustomerRow } from "@/lib/types";

/** Buscador de clientes activos (por nombre o teléfono). */
export default function CustomerPicker({
  value,
  onChange,
}: {
  value: CustomerRow | null;
  onChange: (c: CustomerRow | null) => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (value) return;
    const t = setTimeout(async () => {
      try {
        const r = await rpc<CustomerRow[]>("list_customers", { p_search: q.trim() });
        setRows(r.filter((c) => c.active).slice(0, 8));
        setError("");
      } catch (e) {
        setError((e as Error).message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border-[3px] border-rosa/40 bg-rosa-claro px-4 py-3">
        <div>
          <p className="font-semibold">{value.name}</p>
          <p className="text-sm text-morado/70">
            {phoneFmt(value.phone)} · {pts(value.balance)} pts disponibles
          </p>
        </div>
        <button className="btn-blanco btn-sm" onClick={() => onChange(null)}>
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        className="field"
        placeholder="Buscar cliente por nombre o WhatsApp"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar cliente"
      />
      {error && <p className="mt-2 text-sm text-fresa">{error}</p>}
      <ul className="mt-2 space-y-1">
        {rows.map((c) => (
          <li key={c.id}>
            <button
              className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-2 text-left hover:bg-rosa-claro"
              onClick={() => onChange(c)}
            >
              <span>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-sm text-morado/60">{phoneFmt(c.phone)}</span>
              </span>
              <span className="text-sm font-semibold text-verde">{pts(c.balance)} pts</span>
            </button>
          </li>
        ))}
        {rows.length === 0 && !error && <li className="px-2 text-sm text-morado/60">Sin resultados.</li>}
      </ul>
    </div>
  );
}
