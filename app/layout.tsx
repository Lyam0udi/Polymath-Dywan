import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_CONFIG } from "@/app.config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

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
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
