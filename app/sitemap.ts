import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/app.config";

/**
 * Production origin for absolute sitemap URLs.
 * Prefer NEXT_PUBLIC_APP_URL (Vercel / .env.local); fall back to APP_CONFIG default.
 */
function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const raw =
    fromEnv && fromEnv.length > 0
      ? fromEnv
      : APP_CONFIG.env.NEXT_PUBLIC_APP_URL;
  return raw.replace(/\/$/, "");
}

/**
 * Canonical URLs for crawlable surfaces.
 * Primary product view is `/universe` (priority 0.9); landing `/` remains the site root.
 */
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
      // Canonical primary universe view — must stay absolute via getBaseUrl().
      url: `${baseUrl}/universe`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
