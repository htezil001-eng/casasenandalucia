import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amordidas Puntos",
  description: "Dale una mordida al antojo. Tus puntos de la semana.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/assets/icon-192.png", apple: "/assets/icon-192.png" },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Amordidas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#E0509A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
