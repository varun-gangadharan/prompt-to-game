import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { clerkEnabled } from "@/lib/auth/clerkEnabled";

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
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  // Only mount ClerkProvider when keys are configured — in a production build
  // it throws without a publishable key. See lib/auth/clerkEnabled.
  return clerkEnabled ? <ClerkProvider>{document}</ClerkProvider> : document;
}
