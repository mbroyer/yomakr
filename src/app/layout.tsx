import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yomakr",
  description: "Lernen, fragen, bauen – mit YoMa.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Yomakr", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5b4cf0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
