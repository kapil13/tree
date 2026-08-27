import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/pwa/pwa-register";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-indic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aranyix — Intelligence for a Thriving Planet",
  description:
    "Environmental MRV platform — tree registration, satellite SAR fusion, bioacoustic biodiversity, and audit-ready BRSR, ISO 14064-2, TNFD, and VM0047 exports.",
  manifest: "/manifest.webmanifest",
  themeColor: "#052e1f",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "Aranyix",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sourceSans.variable} ${sourceSerif.variable} ${notoDevanagari.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
          <Providers>
            <PwaRegister />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
