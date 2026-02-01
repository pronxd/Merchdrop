import Footer from "@/components/storefront/Footer";
import Link from "next/link";

export const metadata = {
  title: "Shipping Information - PUBLICINFAMY",
};

export default function ShippingInformation() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/" className="text-white/60 hover:text-red-500 transition-colors">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Shipping Information</span>
        </nav>

        <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-2">
          Shipping Information
        </h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 31, 2026</p>

        <div className="space-y-10 text-white/70 font-inter leading-relaxed">
          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Processing Time
            </h2>
            <p>
              All orders are processed within <span className="text-white font-medium">1-3 business days</span> after payment is confirmed. Orders placed on weekends or holidays will be processed on the next business day. You will receive a confirmation email with tracking information once your order has shipped.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Domestic Shipping (United States)
            </h2>
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-4 py-3 text-white font-medium">Method</th>
                    <th className="text-left px-4 py-3 text-white font-medium">Estimated Delivery</th>
                    <th className="text-left px-4 py-3 text-white font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-3">Standard Shipping</td>
                    <td className="px-4 py-3">5-7 business days</td>
                    <td className="px-4 py-3">$5.99</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-3">Expedited Shipping</td>
                    <td className="px-4 py-3">2-3 business days</td>
                    <td className="px-4 py-3">$12.99</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Orders $100+</td>
                    <td className="px-4 py-3">5-7 business days</td>
                    <td className="px-4 py-3 text-red-500 font-medium">FREE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              International Shipping
            </h2>
            <p className="mb-3">
              We offer international shipping to select countries. International shipping rates and delivery times vary by destination and are calculated at checkout.
            </p>
            <p>
              Please note that international orders may be subject to customs duties, taxes, and fees imposed by your country. These charges are the responsibility of the recipient and are not included in the order total.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Order Tracking
            </h2>
            <p>
              Once your order ships, you will receive an email with a tracking number. You can also check your order status using the order lookup feature on our site. Please allow up to 24 hours after receiving your shipping confirmation for tracking information to update.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Lost or Delayed Packages
            </h2>
            <p>
              If your package appears to be lost or has not arrived within the expected delivery window, please contact us at{" "}
              <a href="mailto:support@publicinfamy.com" className="text-red-500 hover:text-red-400 transition-colors">
                support@publicinfamy.com
              </a>{" "}
              and we will work with the carrier to resolve the issue. We are not responsible for delays caused by the shipping carrier, weather, or customs processing.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Incorrect Address
            </h2>
            <p>
              Please ensure your shipping address is correct before completing your order. We are not responsible for orders shipped to an incorrect address provided by the customer. If you notice an error, contact us immediately and we will do our best to update the address before the order ships.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
