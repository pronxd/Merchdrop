import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - Kassy Cakes",
  description: "Get in touch with Kassy Cakes. Order custom cakes or reach out with any questions.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-creamWhite">

      {/* Header */}
      <header className="bg-[#ff94b3] py-12 px-4 relative overflow-hidden">
        {/* Decorative Angel */}
        <div className="absolute -left-2 md:left-12 -bottom-2 md:top-1/2 md:-translate-y-1/2 w-28 md:w-32 opacity-80">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20anngels%20on%20jelly%20cake.png"
            alt="Angels on cake"
            className="drop-shadow-xl w-full h-auto"
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="font-playfair text-5xl md:text-7xl font-bold text-white mb-4 text-shadow-gold">
            Get in Touch
          </h1>
          <p className="font-cormorant text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            problem with your order? Please reach out to me so I can fix it!
          </p>

          {/* Ornamental Divider */}
          <div className="mt-8">
            <svg viewBox="0 0 200 20" className="w-64 mx-auto opacity-80" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 10 Q 50 5, 100 10 T 200 10" stroke="#ffffff" fill="none" strokeWidth="1.5" />
              <circle cx="100" cy="10" r="4" fill="#ffffff" />
              <circle cx="50" cy="8" r="2" fill="#ffffff" />
              <circle cx="150" cy="8" r="2" fill="#ffffff" />
            </svg>
          </div>
        </div>

        <div className="absolute right-2 md:right-12 bottom-4 md:top-1/2 md:-translate-y-1/2 w-16 md:w-32 opacity-80">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
            alt="Angel with cupcake"
            className="drop-shadow-xl w-full h-auto"
          />
        </div>
      </header>

      {/* Contact Information */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg overflow-hidden baroque-shadow p-8 md:p-12">

          {/* Contact Details */}
          <div className="space-y-8 mb-12">
            <div className="text-center">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-deepBurgundy mb-4">
                Contact Information
              </h2>
            </div>

            {/* Instagram DM - Primary Contact */}
            <div className="flex flex-col items-center gap-4 p-6 bg-kassyPink/10 rounded-lg">
              <svg className="w-12 h-12 text-deepBurgundy opacity-80" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <div className="text-center">
                <h3 className="font-playfair text-2xl font-semibold text-deepBurgundy mb-2">
                  Instagram
                </h3>
                <p className="font-cormorant text-lg text-deepBurgundy/70 mb-4">
                  Best way to reach me for questions and orders
                </p>
                <a
                  href="https://www.instagram.com/_kassycakes_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  Message on Instagram
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col items-center gap-4 p-6 bg-baroqueGold/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#8B1538" className="opacity-80">
                <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/>
              </svg>
              <div className="text-center">
                <h3 className="font-playfair text-2xl font-semibold text-deepBurgundy mb-2">
                  Email
                </h3>
                <a
                  href="mailto:kassybakes@gmail.com"
                  className="font-cormorant text-xl text-kassyPink hover:text-baroqueGold transition-colors"
                >
                  kassybakes@gmail.com
                </a>
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col items-center gap-4 p-6 bg-deepBurgundy/5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#8B1538" className="opacity-80">
                <path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/>
              </svg>
              <div className="text-center">
                <h3 className="font-playfair text-2xl font-semibold text-deepBurgundy mb-2">
                  Location
                </h3>
                <p className="font-cormorant text-xl text-deepBurgundy/80">
                  Kyle, Texas
                </p>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="text-center p-8 bg-gradient-to-br from-kassyPink/5 to-baroqueGold/5 rounded-lg">
            <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-4">
              Ready to Order?
            </h3>
            <p className="font-cormorant text-lg text-deepBurgundy/80 mb-6">
              Browse my collection of handcrafted cakes and place your order today!
            </p>
            <a
              href="/cakes"
              className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              View Our Cakes
            </a>
          </div>

        </div>

        {/* Bottom Angel Decoration */}
        <div className="mt-16 flex justify-center">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20sitting%20on%20moon%20looking%20back%20holding%20spoon%20artwork.png"
            alt="Angel on moon"
            className="drop-shadow-2xl opacity-80 w-48 h-auto"
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
