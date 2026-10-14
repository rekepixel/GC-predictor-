import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "GC Predictor · Estudia con evidencia",
  description:
    "Análisis verificable de exámenes oficiales de Guardia Civil. Tu preparación para 2027.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GC Predictor",
    statusBarStyle: "default",
  },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#143c34",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
