export type NoticeT = { kind: "ok" | "error" | "warn"; text: string } | null;

export default function Notice({ notice }: { notice: NoticeT }) {
  if (!notice) return null;
  const cls =
    notice.kind === "ok"
      ? "bg-verde/15 text-[#2f6e12] border-verde/40"
      : notice.kind === "warn"
        ? "bg-amarillo/30 text-morado border-amarillo"
        : "bg-fresa/10 text-fresa border-fresa/40";
  return (
    <p role="status" className={`mt-3 rounded-2xl border-2 px-4 py-2 font-medium ${cls}`}>
      {notice.text}
    </p>
  );
}
