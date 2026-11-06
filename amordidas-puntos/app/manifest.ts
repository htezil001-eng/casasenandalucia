import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amordidas Puntos",
    short_name: "Amordidas",
    description: "Dale una mordida al antojo. Tus puntos de la semana.",
    start_url: "/equipo/login",
    display: "standalone",
    background_color: "#FFF8FB",
    theme_color: "#E0509A",
    lang: "es-MX",
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
