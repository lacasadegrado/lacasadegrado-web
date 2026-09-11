import type { Metadata, Viewport } from "next";
import { Boldonse, Fira_Sans } from "next/font/google";

import { BRAND, BRAND_COLORS } from "@/common/lib/constants/brand";
import { AppProvider } from "@/common/lib/providers/app.provider";

import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

const boldonse = Boldonse({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-boldonse",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLORS.cream },
    { media: "(prefers-color-scheme: dark)", color: "#0A2530" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${firaSans.variable} ${boldonse.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
        >
          Saltar al contenido
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
