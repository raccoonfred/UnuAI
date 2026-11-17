import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNU AI",
  description: "AI business assistant for the UNU guitar brand",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
