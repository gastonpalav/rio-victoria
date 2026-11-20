import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Big_Shoulders } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: "Altura del río Paraná en Victoria",
  description: "La altura del río Paraná en Victoria (Entre Ríos) y aguas arriba, con datos de Prefectura Naval Argentina.",
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#E4E8E5" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
