import Footer from "@/components/storefront/Footer";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service - PUBLICINFAMY",
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/" className="text-white/60 hover:text-red-500 transition-colors">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Terms of Service</span>
        </nav>

        <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-2">
          Terms of Service
        </h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 31, 2026</p>

        <div className="space-y-10 text-white/70 font-inter leading-relaxed">
          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Overview
            </h2>
            <p>
              This website is operated by PublicInfamy.com. By visiting our site and/or purchasing from us, you agree to be bound by the following terms and conditions. Please read them carefully before using our site or making a purchase.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Online Store Terms
            </h2>
            <p className="mb-3">
              By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, and you have given us your consent to allow any of your minor dependents to use this site.
            </p>
            <p>
              You may not use our products for any illegal or unauthorized purpose, nor may you violate any laws in your jurisdiction when using this site.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Products and Pricing
            </h2>
            <p className="mb-3">
              We reserve the right to modify or discontinue any product at any time without notice. Prices are subject to change without notice. We do not guarantee that the quality of any products or information obtained through our site will meet your expectations.
            </p>
            <p>
              All product descriptions, images, and pricing are provided as accurately as possible. However, we do not warrant that descriptions or other content are error-free. Colors may vary slightly due to screen display differences.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Accuracy of Information
            </h2>
            <p>
              We are not responsible if information made available on this site is not accurate, complete, or current. The material on this site is provided for general information only and should not be relied upon as the sole basis for making decisions.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Intellectual Property
            </h2>
            <p>
              All content on this site, including text, graphics, logos, images, and software, is the property of PublicInfamy.com or its content suppliers and is protected by copyright and intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Limitation of Liability
            </h2>
            <p>
              In no case shall PublicInfamy.com, our directors, officers, employees, affiliates, or suppliers be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential damages of any kind arising out of your use of the site or any product purchased from us.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Governing Law
            </h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of the United States.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Changes to Terms
            </h2>
            <p>
              We reserve the right to update or modify these terms at any time without prior notice. Your continued use of the site following any changes constitutes your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wider mb-4">
              Contact
            </h2>
            <p>
              Questions about these Terms of Service can be directed to{" "}
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
