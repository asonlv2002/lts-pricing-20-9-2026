import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import VoTrang from "../components/layout/VoTrang";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LTS Pricing — Tính Giá Bao Bì",
  description: "Hệ thống tính giá túi bao bì - CTY CP Lai Trường Sơn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <VoTrang>{children}</VoTrang>
      </body>
    </html>
  );
}
