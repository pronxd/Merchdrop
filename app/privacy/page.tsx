import Footer from "@/components/storefront/Footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - PUBLICINFAMY",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/" className="text-white/60 hover:text-red-500 transition-colors">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Privacy Policy</span>
        </nav>

        <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-2">
          Privacy Policy
        </h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 31, 2026</p>

        <div className="space-y-10 text-white/70 font-inter leading-relaxed">
          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Information We Collect
            </h2>
            <p className="mb-3">
              When you visit our site or make a purchase, we collect certain information about your device, your interaction with the site, and information necessary to process your orders. We may also collect additional information if you contact us for customer support.
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/60">
              <li>Name, email address, shipping and billing address</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Device information such as browser type and IP address</li>
              <li>Information about how you browse and interact with our store</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-white/60">
              <li>Fulfill and manage orders, payments, and shipping</li>
              <li>Communicate with you about your order or account</li>
              <li>Screen orders for potential fraud or risk</li>
              <li>Provide you with information or advertising relating to our products (with your consent)</li>
              <li>Improve and optimize our site and customer experience</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Sharing Your Information
            </h2>
            <p>
              We do not sell your personal information. We share your information with third parties only to help us operate our store, process payments, fulfill orders, and analyze site usage. These third parties include Stripe (payments), our shipping carriers, and analytics providers. All third parties are bound by their own privacy policies and are only given access to information necessary to perform their services.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Cookies
            </h2>
            <p>
              We use cookies and similar technologies to remember your preferences, understand how you use our site, and improve your experience. You can control cookies through your browser settings, though disabling them may affect site functionality.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Data Retention
            </h2>
            <p>
              We retain your order information for our records unless and until you ask us to delete it. If you place an order, we will maintain your information for our records for the purpose of fulfilling any legal or reporting obligations.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Your Rights
            </h2>
            <p>
              If you are a resident of certain territories, you have the right to access the personal information we hold about you, request correction or deletion of your data, and opt out of marketing communications. To exercise any of these rights, please contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Contact Us
            </h2>
            <p>
              For questions about this Privacy Policy or your personal data, please contact us at{" "}
              <a href="mailto:support@publicinfamy.com" className="text-red-500 hover:text-red-400 transition-colors">
                support@publicinfamy.com
              </a>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
