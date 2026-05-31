import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt to Game",
  description: "Generate and tune browser games from a prompt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
