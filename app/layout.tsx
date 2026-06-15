import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORGE AI PC Builder",
  description: "AI-powered PC builds with regional pricing, FPS estimates, component comparisons, and invoices.",
  openGraph: {
    title: "FORGE AI PC Builder",
    description: "Generate compatible gaming and workstation PC builds from your budget.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
