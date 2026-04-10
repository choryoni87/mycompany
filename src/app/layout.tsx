import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE?.trim() || "회사 일정";

export const metadata: Metadata = {
  title: siteTitle,
  description:
    "공개 Google 스프레드시트에서 불러온 일정을 표시합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
