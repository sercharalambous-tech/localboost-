import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LocalBoost", template: "%s | LocalBoost" },
  description: "Reduce no-shows and grow Google Reviews for your local business in Cyprus.",
  keywords: ["appointments", "reminders", "Google reviews", "Cyprus", "SMB"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
