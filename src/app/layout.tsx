import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "英语精读翻译",
  description: "沉浸式英语分句精译工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
