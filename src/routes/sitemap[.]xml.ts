import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/browse", priority: "0.9", changefreq: "daily" },
          { path: "/how-it-works", priority: "0.7", changefreq: "monthly" },
          { path: "/transparency", priority: "0.7", changefreq: "daily" },
          { path: "/auth/login", priority: "0.4", changefreq: "monthly" },
          { path: "/auth/register", priority: "0.4", changefreq: "monthly" },
        ];
        const urls = entries.map((e) =>
          `  <url><loc>${BASE_URL}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
