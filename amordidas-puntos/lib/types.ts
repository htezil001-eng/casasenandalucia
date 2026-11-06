export type Reward = { id: string; name: string; cost: number };

export type CustomerView = {
  name: string;
  balance: number;
  week_earned: number;
  week_start: string;
  week_resets_at: string;
  pesos_por_punto: number;
  ledger: { at: string; type: string; points: number; detail: string }[];
  rewards: (Reward & { faltan: number })[];
  orders_en_camino: { folio: string; amount: number; delivery_code: string; points: number }[];
  redeem: { reward: string; code: string; seconds_left: number } | null;
};

export type StaffProfile = { id: string; name: string; role: "gerente" | "repartidor" };

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  week_earned: number;
  active: boolean;
  public_token: string | null;
  notes: string | null;
  created_at: string;
};

export type Delivery = {
  id: string;
  folio: string;
  customer_name: string;
  phone: string;
  amount: number;
  created_at: string;
};

export type OrderRow = {
  id: string;
  folio: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  driver_name: string;
  amount: number;
  status: "en_camino" | "entregado" | "bloqueado" | "cancelado";
  attempts: number;
  created_at: string;
  delivered_at: string | null;
};

export type LedgerRow = {
  id: number;
  created_at: string;
  customer_name: string;
  phone: string;
  type: string;
  points: number;
  detail: string;
  actor: string | null;
};

export type Alert = { id: number; level: "warn" | "bad"; text: string; created_at: string };
