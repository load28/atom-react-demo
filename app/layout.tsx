import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "모의 주식 트레이딩",
  description: "모의 주식 트레이딩 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
