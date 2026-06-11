import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YonelMa — France ↔ Senegal Shipping",
    short_name: "YonelMa",
    description:
      "Send parcels between France and Senegal with transparent pricing and real-time tracking.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8f7",
    theme_color: "#0b8457",
    categories: ["shopping", "logistics", "travel"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
