"use client";

import { SessionProvider } from "next-auth/react";
import { ProductsProvider } from "@/context/ProductsContext";
import { StorefrontCartProvider } from "@/context/StorefrontCartContext";
import Header from "@/components/storefront/Header";
import CartDrawer from "@/components/storefront/CartDrawer";
import { usePathname } from "next/navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <SessionProvider>
      <ProductsProvider>
        <StorefrontCartProvider>
          {!isAdminPage && <Header />}
          {!isAdminPage && <CartDrawer />}
          {children}
        </StorefrontCartProvider>
      </ProductsProvider>
    </SessionProvider>
  );
}
