import "@/lib/storage-polyfill";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kampmax - Your Campus Marketplace & Freelance Hub",
  description: "A campus-focused digital marketplace, services, and freelance platform for Nigerian university students",
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
