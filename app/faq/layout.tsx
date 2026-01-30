import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ - Kassy Cakes",
  description: "Frequently asked questions about ordering custom cakes from Kassycakes. Learn about pricing, flavors, sizes, delivery, and more.",
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
