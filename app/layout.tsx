import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteAnalytics } from "@/app/ui/site-analytics";
import { SiteHeader } from "@/app/ui/site-header";
import { getViewer } from "@/lib/auth";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "The Loo York Times", template: "%s | The Loo York Times" },
  description: "Find eligible public restrooms across New York City.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SiteHeader viewer={viewer} />
        <SiteAnalytics />
        {children}
        <footer className="site-footer">
          <div className="page-width footer-inner">
            <p className="footer-name">The Loo York Times</p>
            <p>A working demonstration for a more usable city.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
