import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/deployment";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const siteUrl = getSiteUrl();

// Runs before first paint: returning visitors in the same tab never see the lock screen flash.
const unlockedScript = `try{if(sessionStorage.getItem("portfolio-unlocked")==="1")document.documentElement.classList.add("unlocked")}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Karthick S — Application Support & Site Reliability Engineer", template: "%s | Karthick S" },
  description: "Karthick S is an application support and site reliability engineer keeping production applications and Linux systems healthy at Amazon.",
  alternates: { canonical: siteUrl },
  openGraph: { title: "Karthick S — Built Block by Block", description: "Application support and site reliability engineer: on-call, observability, Linux and AI-assisted operations.", url: siteUrl, siteName: "Karthick S Portfolio", type: "profile" },
  twitter: { card: "summary", title: "Karthick S — Built Block by Block", description: "Application support and site reliability engineer: on-call, observability, Linux and AI-assisted operations." },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#080b0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: unlockedScript }} /></head><body>{children}</body></html>;
}
