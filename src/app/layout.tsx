import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🦷 牙科预约助手",
  description: "AI 牙科诊所预约助手 - 咨询牙齿问题，快速预约医生",
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
