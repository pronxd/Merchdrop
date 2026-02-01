import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import UmamiAnalytics from "@/components/UmamiAnalytics";
import PresenceTracker from "@/components/PresenceTracker";
import VisitorTracker from "@/components/VisitorTracker";

export const metadata: Metadata = {
  title: "POPDRP - Official Store",
  description: "Official POPDRP store. Apparel, accessories, and exclusive drops.",
  icons: {
    icon: [
      { url: '/favicon.jpg' },
      { url: '/favicon-16x16.jpg', sizes: '16x16' },
      { url: '/favicon-32x32.jpg', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <UmamiAnalytics />
        <PresenceTracker />
        <VisitorTracker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
