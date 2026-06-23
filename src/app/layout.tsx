import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BigWord · 文本拼字艺术",
  description: "用素材文本的字符堆叠还原目标文本的视觉形态，实时预览的 ASCII Art 拼字工具，基于 EdgeOne 边缘云。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/python-favicon.svg" />
      </head>
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
