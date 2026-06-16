import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SKILLRANK AI",
  description: "Curiosity is your currency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}