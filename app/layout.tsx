import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Uniónutriita",
    template: "%s | Uniónutriita",
  },
  description:
    "La red universitaria para estudiar, conectar y vivir la comunidad ENES Oaxaca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
