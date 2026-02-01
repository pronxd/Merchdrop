import Footer from "@/components/storefront/Footer";
import Link from "next/link";

export const metadata = {
  title: "Refund Policy - PUBLICINFAMY",
};

export default function RefundPolicy() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/" className="text-white/60 hover:text-red-500 transition-colors">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Refund Policy</span>
        </nav>

        <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-2">
          Refund Policy
        </h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 31, 2026</p>

        <div className="space-y-10 text-white/70 font-inter leading-relaxed">
          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Returns
            </h2>
            <p>
              We want you to be completely satisfied with your purchase. If you are not happy with your order, you may request a return within <span className="text-white font-medium">14 days</span> of receiving your item. Items must be unused, unworn, unwashed, and in their original packaging with all tags attached.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Non-Returnable Items
            </h2>
            <ul className="list-disc list-inside space-y-2 text-white/60">
              <li>Items that have been worn, washed, or altered</li>
              <li>Items without original tags or packaging</li>
              <li>Items purchased during final sale or clearance promotions</li>
              <li>Gift cards</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              How to Initiate a Return
            </h2>
            <p className="mb-3">To start a return, please contact us at{" "}
              <a href="mailto:support@publicinfamy.com" className="text-red-500 hover:text-red-400 transition-colors">
                support@publicinfamy.com
              </a>{" "}
              with your order number and reason for return. We will provide you with return instructions and a shipping address.
            </p>
            <p>
              Return shipping costs are the responsibility of the customer unless the item was received damaged or incorrect.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Refund Process
            </h2>
            <p className="mb-3">
              Once we receive and inspect your returned item, we will notify you of the approval or rejection of your refund. Approved refunds will be processed to your original payment method within <span className="text-white font-medium">5-10 business days</span>.
            </p>
            <p>
              Please note that your bank or credit card company may take additional time to post the refund to your account.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Exchanges
            </h2>
            <p>
              We do not offer direct exchanges at this time. If you need a different size or product, please return your original item for a refund and place a new order.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Damaged or Incorrect Items
            </h2>
            <p>
              If you receive a damaged or incorrect item, please contact us within <span className="text-white font-medium">48 hours</span> of delivery with photos of the issue. We will arrange a replacement or full refund at no additional cost to you.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
