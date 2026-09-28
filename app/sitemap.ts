import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/app.config";

/**
 * Production origin for absolute sitemap URLs.
 * Prefer NEXT_PUBLIC_APP_URL (Vercel / .env.local); fall back to APP_CONFIG default.
 */
function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const raw = fromEnv && fromEnv.length > 0
    ? fromEnv
    : APP_CONFIG.env.NEXT_PUBLIC_APP_URL;
  return raw.replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/universe`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
