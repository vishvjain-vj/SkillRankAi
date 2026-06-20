import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

// Configure Google Sans using the raw .ttf files you already have!
const googleSans = localFont({
  src: [
    {
      path: "../../public/fonts/GoogleSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GoogleSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-google-sans", 
});

export const metadata: Metadata = {
  title: "SkillRank AI",
  description: "Curiosity is your currency.",
  // ADD THIS ENTIRE ICONS AND MANIFEST SECTION:
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png', // For iOS Home Screen bookmarks
    other: {
      rel: 'mask-icon',
      url: '/safari-pinned-tab.svg',
      color: '#0dcbc1', /* The exact hex code of your teal gear */
    },
  },
  manifest: '/site.webmanifest', // (Or '/manifest.json' depending on what your zip generated)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${googleSans.variable}`}>
      <body className="antialiased">
        {/* WRAP THE CHILDREN LIKE THIS: */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}