"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import Notice, { type NoticeT } from "@/components/Notice";
import { rpc, supabase } from "@/lib/supabase";
import type { StaffProfile } from "@/lib/types";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeT>(
    params.get("e") === "sin-rol" ? { kind: "error", text: "Tu usuario no está dado de alta en el equipo. Habla con el gerente." } : null,
  );

  async function goByRole() {
    const rows = await rpc<StaffProfile[]>("my_staff_profile");
    const p = rows?.[0];
    if (!p) {
      await supabase().auth.signOut();
      setNotice({ kind: "error", text: "Tu usuario no está dado de alta en el equipo. Habla con el gerente." });
      return;
    }
    router.replace(`/equipo/${p.role}`);
  }

  // Si ya hay sesión, entrar directo
  useEffect(() => {
    if (params.get("e")) return;
    supabase()
      .auth.getSession()
      .then(({ data }) => data.session && goByRole().catch(() => {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(/invalid/i.test(error.message) ? "Correo o contraseña incorrectos." : error.message);
      await goByRole();
    } catch (err) {
      setNotice({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <div className="flex justify-center">
        <Logo className="w-44" />
      </div>
      <form onSubmit={submit} className="card mt-6 space-y-4">
        <h1 className="text-center text-2xl font-semibold">Entrada del equipo</h1>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-rosa w-full" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <Notice notice={notice} />
      </form>
      <p className="mt-4 text-center text-sm text-morado/60">Solo para gerentes y repartidores de Amordidas.</p>
    </main>
  );
}
