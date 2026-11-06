"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rpc, supabase } from "@/lib/supabase";
import type { StaffProfile } from "@/lib/types";

/** Exige sesión del equipo con el rol indicado; si no, manda al login. */
export function useStaff(role: StaffProfile["role"]) {
  const router = useRouter();
  const [me, setMe] = useState<StaffProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase().auth.getSession();
      if (!data.session) return router.replace("/equipo/login");
      try {
        const rows = await rpc<StaffProfile[]>("my_staff_profile");
        const p = rows?.[0];
        if (!p) return router.replace("/equipo/login?e=sin-rol");
        if (p.role !== role) return router.replace(`/equipo/${p.role}`);
        if (!cancelled) setMe(p);
      } catch {
        router.replace("/equipo/login");
      }
    })();
    const { data: sub } = supabase().auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") router.replace("/equipo/login");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [role, router]);

  return me;
}

export async function signOut() {
  await supabase().auth.signOut();
}
