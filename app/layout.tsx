import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bons Plans — les offres de ta ville",
  description: "Retrouve les bons plans des commerçants près de chez toi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
