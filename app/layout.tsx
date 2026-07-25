import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CityProvider } from "@/lib/cityContext";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

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
    <html lang="fr" className={bodyFont.variable}>
      <body>
        <CityProvider>{children}</CityProvider>
      </body>
    </html>
  );
}
