import type { Metadata } from "next";
import "./globals.css";
import { CityProvider } from "@/lib/cityContext";

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
      <body>
        <CityProvider>{children}</CityProvider>
      </body>
    </html>
  );
}
