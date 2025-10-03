import type { Metadata } from "next";
import { Noto_Serif_JP, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-m-plus-rounded",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "日記交換 - 静かな偶然と、一期一会の繋がり",
  description: "誰かの日常にそっと触れる、一日限りの日記交換アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSerif.variable} ${mPlusRounded.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
