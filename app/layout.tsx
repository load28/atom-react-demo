import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Effect + Atom Demo",
  description: "Effect와 Atom을 활용한 React 상태 관리 데모",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
