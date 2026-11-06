/* eslint-disable @next/next/no-img-element */
export default function Logo({ className = "w-40" }: { className?: string }) {
  return <img src="/assets/logo.png" alt="Amordidas" className={`${className} h-auto`} width={480} height={403} />;
}
