import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen" and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stardrop Logs",
    short_name: "Stardrop",
    description: "A cozy pixel gut-health diary with Mia.",
    start_url: "/",
    display: "standalone",
    background_color: "#2b1d5e",
    theme_color: "#2b1d5e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
