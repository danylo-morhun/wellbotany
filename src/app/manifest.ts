import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Well Botany",
    short_name: "Well Botany",
    description: "Sklep z suplementami diety, witaminami i produktami bio.",
    start_url: "/",
    display: "standalone",
    background_color: "#EAF6EF",
    theme_color: "#07674A",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
