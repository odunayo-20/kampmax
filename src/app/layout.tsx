import "@/lib/storage-polyfill";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { Providers } from "@/lib/providers";
import { RouteProgress } from "@/components/ui/RouteProgress";
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
    // Browser extensions (Grammarly, password managers) add attributes to <html> and
    // <body> before React loads. That is harmless, so don't report it as a mismatch.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RouteProgress />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
