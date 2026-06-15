import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORGE AI PC Builder",
  description: "AI-powered PC builds with regional pricing, FPS estimates, comparisons, and invoices.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
