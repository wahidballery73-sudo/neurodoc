import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import Sidebar from "@/components/sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NeuroDoc",
  description: "Chat with your documents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="flex h-screen w-full">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}