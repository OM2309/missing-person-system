import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Missing Person Finder",
  description: "AI-based missing person identification system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
