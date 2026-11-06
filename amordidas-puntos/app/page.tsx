import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo className="w-56" />
      <p className="text-xl">Dale una mordida al antojo.</p>
      <p className="text-morado/70">
        ¿Eres cliente? Abre el link personal que te mandamos por WhatsApp para ver tus puntos.
      </p>
      <Link href="/equipo/login" className="btn-rosa w-full">
        Entrar como equipo
      </Link>
    </main>
  );
}
