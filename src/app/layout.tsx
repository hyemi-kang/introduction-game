import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PIXEL VILLAGE — 자기소개 게임",
  description: "캐릭터를 조작해 마을을 돌아다니며 나를 소개하는 2D 픽셀 포트폴리오",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#cdeeff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
