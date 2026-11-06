"use client";
import { useEffect, useState } from "react";
import StaffHeader from "@/components/StaffHeader";
import Tabs from "@/components/Tabs";
import RedeemPanel from "@/components/RedeemPanel";
import Clientes from "@/components/gerente/Clientes";
import Pedidos from "@/components/gerente/Pedidos";
import Ajuste from "@/components/gerente/Ajuste";
import Recordatorios from "@/components/gerente/Recordatorios";
import Control from "@/components/gerente/Control";
import { useStaff } from "@/components/useStaff";
import { rpc } from "@/lib/supabase";
import type { Reward } from "@/lib/types";

type Tab = "clientes" | "pedidos" | "canje" | "ajuste" | "recordatorios" | "control";

export default function GerentePage() {
  const me = useStaff("gerente");
  const [tab, setTab] = useState<Tab>("clientes");
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    if (me) rpc<Reward[]>("list_rewards").then(setRewards).catch(() => {});
  }, [me]);

  if (!me) return <p className="py-20 text-center text-morado/60">Cargando…</p>;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-10">
      <StaffHeader me={me} />
      <Tabs<Tab>
        tabs={[
          { id: "clientes", label: "Clientes" },
          { id: "pedidos", label: "Pedidos" },
          { id: "canje", label: "Canjear" },
          { id: "ajuste", label: "Ajuste" },
          { id: "recordatorios", label: "Recordatorios" },
          { id: "control", label: "Alertas e historial" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "clientes" && <Clientes rewards={rewards} />}
      {tab === "pedidos" && <Pedidos />}
      {tab === "canje" && <RedeemPanel />}
      {tab === "ajuste" && <Ajuste />}
      {tab === "recordatorios" && <Recordatorios rewards={rewards} />}
      {tab === "control" && <Control />}
    </main>
  );
}
