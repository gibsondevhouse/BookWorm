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
      <body className="h-screen m-0 p-0 overflow-hidden">
        <div className="flex h-screen overflow-hidden">
          <div className="w-[220px] flex-shrink-0 overflow-hidden">
            <AppSidebar />
          </div>
          <main className="flex-1 overflow-hidden min-h-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
