import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snake Score Arena",
  description: "Login, play Snake, and save scores to your profile.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
