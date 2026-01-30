"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/context/CartContext";
import { TransitionProvider } from "@/context/TransitionContext";
import { ProductsProvider } from "@/context/ProductsContext";
import Navigation from "@/components/Navigation";
import PromoPopup from "@/components/PromoPopup";
import { usePathname } from "next/navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/kassycakes/dashboard') || pathname?.startsWith('/kassycakes/orders') || pathname?.startsWith('/kassycakes');

  return (
    <SessionProvider>
      <ProductsProvider>
        <CartProvider>
          <TransitionProvider>
            {!isAdminPage && <Navigation />}
            {!isAdminPage && <PromoPopup />}
            {children}
          </TransitionProvider>
        </CartProvider>
      </ProductsProvider>
    </SessionProvider>
  );
}
