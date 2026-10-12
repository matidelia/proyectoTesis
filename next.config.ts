import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El service worker de notificaciones push no debe quedar cacheado:
  // si cambia, el navegador tiene que tomar la versión nueva.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
