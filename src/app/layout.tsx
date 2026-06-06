import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🦷 牙小助AI",
  description: "牙小助AI - 您的智能牙科健康顾问，咨询牙齿问题，快速预约医生",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
