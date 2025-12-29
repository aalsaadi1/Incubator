import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Incubator - The Gatekeeper",
  description: "The first incubator that proves you are worth funding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
