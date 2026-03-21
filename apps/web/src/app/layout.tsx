import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { AppSidebar } from "./AppSidebar";

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
      <body>
        <div className="flex h-screen w-screen">
          <div className="w-64 flex-shrink-0">
            <AppSidebar />
          </div>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
