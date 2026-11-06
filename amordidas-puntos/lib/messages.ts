import { customerLink } from "./config";
import { nextReward } from "./format";
import type { Reward } from "./types";

export const msgBienvenida = (name: string, token: string) =>
  `¡Hola ${name}! 🍓 Bienvenid@ a Amordidas Puntos. Aquí puedes ver tus puntos: ${customerLink(token)}`;

/** El código de entrega NUNCA va en el mensaje: el cliente lo ve en su link. */
export const msgPedido = (folio: string, token: string) =>
  `Tu pedido ${folio} va en camino 🛵. Abre tu link para ver tu código de entrega: ${customerLink(token)}`;

export function msgSaldo(c: { name: string; week_earned: number; balance: number }, token: string, rewards: Reward[]) {
  const next = nextReward(c.balance, rewards);
  const falta = next
    ? `Te faltan ${next.faltan} para tu ${next.name}.`
    : "¡Ya alcanzas todos los premios de la semana! 🎉";
  return `Hola ${c.name} 🍓, llevas ${c.week_earned} pts esta semana. ${falta} ¡Se reinician el lunes! ${customerLink(token)}`;
}
