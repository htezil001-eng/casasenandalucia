"use client";
export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; badge?: number }[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`shrink-0 rounded-full border-[3px] px-4 py-2 font-semibold ${
            value === t.id ? "border-rosa bg-rosa text-white" : "border-morado/15 bg-white text-morado"
          }`}
        >
          {t.label}
          {t.badge ? (
            <span className="ml-2 rounded-full bg-amarillo px-2 text-sm text-morado">{t.badge}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
