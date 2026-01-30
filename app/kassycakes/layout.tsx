import { CartProvider } from "@/context/CartContext";
import { TransitionProvider } from "@/context/TransitionContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <TransitionProvider>
        {children}
      </TransitionProvider>
    </CartProvider>
  );
}
