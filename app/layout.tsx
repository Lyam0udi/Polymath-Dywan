import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_CONFIG } from "@/app.config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

/** Brand voice: intellectual observatory for non-linear, Socratic discovery. */
const BRAND_DESCRIPTION =
  "An intellectual observatory for autodidacts — map interconnected knowledge in a living 3D universe, guided by Socratic dialogue one clear step at a time.";

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.metadata.title,
    template: `%s · ${APP_CONFIG.metadata.title}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: APP_CONFIG.metadata.title,
  icons: {
    // Next.js App Router also auto-serves app/favicon.ico; explicit icons keep the root layout contract clear.
    icon: [{ url: "/favicon.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" }],
  },
  openGraph: {
    title: APP_CONFIG.metadata.title,
    description: BRAND_DESCRIPTION,
    type: "website",
    siteName: APP_CONFIG.metadata.title,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
