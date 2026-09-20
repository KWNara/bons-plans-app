import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CityProvider } from "@/lib/cityContext";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PasswordRecoveryRedirect } from "@/components/PasswordRecoveryRedirect";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const siteUrl = "https://bons-plans-app.vercel.app";
const title = "Déniche — les offres de ta ville";
const description = "Retrouve les bons plans des commerçants près de chez toi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Déniche",
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Déniche",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Déniche" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#20263B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={bodyFont.variable} suppressHydrationWarning>
      <head>
        {/* Appliqué avant le premier rendu : sans ça, une page sombre
            s'afficherait une fraction de seconde en clair au chargement. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('deniche:theme');if(t==='sombre'||((!t||t==='systeme')&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <CityProvider>{children}</CityProvider>
        <Footer />
        <ServiceWorkerRegister />
        <PasswordRecoveryRedirect />
      </body>
    </html>
  );
}
