import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Spectral } from "next/font/google";

import "./globals.css";
import { AppSidebar } from "./AppSidebar";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

const bodyFont = Spectral({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Book Worm",
  description: "Book Worm development shell"
};

type LayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <div className="relative flex min-h-screen flex-col p-3 sm:p-4 lg:h-screen lg:flex-row lg:gap-4">
          <div className="lg:h-full lg:w-80 lg:flex-shrink-0">
            <AppSidebar />
          </div>
          <main className="relative flex-1 overflow-hidden lg:h-full">
            <div className="shell-panel relative h-full overflow-hidden rounded-[2rem]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(134,201,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,195,127,0.08),transparent_24%)]" />
              <div className="relative h-full">{children}</div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
