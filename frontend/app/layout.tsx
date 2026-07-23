import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexara",
  description: "Food delivery platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#dc2626",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg">
      <body suppressHydrationWarning>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
