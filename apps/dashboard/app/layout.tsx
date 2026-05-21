import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A2A Radar",
  description: "Autonomous intelligence and economic routing for Vara agents"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

