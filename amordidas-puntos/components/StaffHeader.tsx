"use client";
import Logo from "./Logo";
import { signOut } from "./useStaff";
import type { StaffProfile } from "@/lib/types";

export default function StaffHeader({ me }: { me: StaffProfile }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Logo className="w-20" />
      <div className="text-right">
        <p className="font-semibold leading-tight">{me.name}</p>
        <p className="text-sm capitalize text-morado/60">{me.role}</p>
      </div>
      <button className="btn-blanco btn-sm" onClick={signOut}>
        Salir
      </button>
    </header>
  );
}
