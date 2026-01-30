import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import UmamiAnalytics from "@/components/UmamiAnalytics";
import PresenceTracker from "@/components/PresenceTracker";
import VisitorTracker from "@/components/VisitorTracker";

export const metadata: Metadata = {
  title: "Kassy Cakes - Custom Artisan Cakes",
  description: "Where Renaissance meets sweetness. Custom artisan cakes crafted with love in Austin, Texas.",
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
        <link
          rel="preload"
          href="https://kassycakes.b-cdn.net/assets/kasscakeslogoanimated800x.webm"
          as="video"
          type="video/webm"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://kassy.b-cdn.net/straighty.mp4"
          as="video"
          type="video/mp4"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://kassycakes.b-cdn.net/assets/WS5V5h8f1T_FaP6d8-mvL.png"
          as="image"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="https://kassycakes.b-cdn.net/assets/pointer.webp"
          as="image"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
          as="image"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
        {/* Flavor Icons */}
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/vanillaflavor.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/chocolate_flavor.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/redvelvet.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/lemonflavor.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/pumpkin%20flavor.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/strawberryFlavor.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/Flavors/funfettiflavor.jpg" as="image" crossOrigin="anonymous" />
        {/* Filling Icons */}
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/strawberry%20compote.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/mixed%20berry%20compote.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/fresh%20whip%20cream.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/vanilla%20custard.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/cream%20cheese%20frosting.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/classic%20vanilla%20frosting.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/classic%20chocolate%20frosting.jpg" as="image" crossOrigin="anonymous" />
        {/* Add-on Icons */}
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/Cherries.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/cakeicons/Glitter%20Cherries.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/Candy%20Pearls.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/addons-icons/bows.png" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/menuicons/addons-icons/editble%20butterflys.jpg" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/Fresh%20florals.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/frostinganimals.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/whitechoclate.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/Gold.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/chrome.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/2d%20character.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/discoballs.webp" as="image" crossOrigin="anonymous" />
        <link rel="preload" href="https://kassy.b-cdn.net/KassyCakeIcons/miniature%20cowboy%20hats.webp" as="image" crossOrigin="anonymous" />
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
