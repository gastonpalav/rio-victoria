import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "regla — altura del río Paraná en Victoria",
  description: "La altura del río Paraná en Victoria (Entre Ríos) y aguas arriba, con datos de Prefectura Naval Argentina.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0E161C" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
