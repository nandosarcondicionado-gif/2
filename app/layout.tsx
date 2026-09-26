import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nando's Ar-Condicionado",
  description: "Qualidade e confiança em todos os detalhes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
