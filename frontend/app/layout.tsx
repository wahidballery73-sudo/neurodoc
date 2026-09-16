import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import PWARegister from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NeuroDoc",
  description: "Chat with your documents. Answers with citations.",
  manifest: "/manifest.json",
  applicationName: "NeuroDoc",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeuroDoc",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
    shortcut: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <PWARegister />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}