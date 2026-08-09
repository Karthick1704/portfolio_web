import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karthick1704.github.io/portfolio_web/";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Karthick S — Software Application Engineer", template: "%s | Karthick S" },
  description: "Karthick S builds reliable cloud applications, production systems and digital experiences—block by block.",
  alternates: { canonical: siteUrl },
  openGraph: { title: "Karthick S — Built Block by Block", description: "Software Application Engineer building reliable cloud applications and production systems.", url: siteUrl, siteName: "Karthick S Portfolio", type: "profile" },
  twitter: { card: "summary", title: "Karthick S — Built Block by Block", description: "Software Application Engineer building reliable cloud applications and production systems." },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#080b0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning><body>{children}</body></html>;
}
