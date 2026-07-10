import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Center",
  description: "Play Snake and Memory Match in a mobile-first browser game center.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
