import type { Metadata } from "next";
import { APP_CONFIG } from "@/app.config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.metadata.title,
  description: "Local-first Socratic knowledge universe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
