"use client";

export default function About() {
  return (
    <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-creamWhite to-[#fce8f3]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="order-2 md:order-1">
            <h2 className="font-playfair text-5xl md:text-6xl font-bold text-deepBurgundy mb-6">
              Artistry in Every Layer
            </h2>

            <div className="space-y-4 font-cormorant text-lg md:text-xl text-deepBurgundy/90 leading-relaxed">
              <p>
                Welcome to <span className="font-semibold text-kassyPink">Kassy Cakes</span>,
                where vintage charm meets modern baking artistry. Nestled in Kyle Texas, between San Antonio and Austin,
                my sweet haven specializes in custom-made cakes adorned with the dreamiest buttercream frosting.
              </p>

              <p>
                Inspired by the grandeur of Renaissance and Baroque art, each cake is meticulously
                handcrafted with love and a keen eye for detail. From whimsical designs to classical
                styles, my cakes are not just desserts — they're a journey back in time with a delicious twist.
              </p>

              <p>
                Perfect for any occasion, let me add a sprinkle of vintage magic and heavenly flavor
                to your celebrations with my cute, custom-made buttercream wonders.
              </p>

              <p className="font-playfair text-2xl text-baroqueGold italic pt-4">
                ~ Kassandra
              </p>
            </div>
          </div>

          {/* Angel Image */}
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative w-80 md:w-96">
              <img
                src="https://kassycakes.b-cdn.net/assets/baby%20angel%20sitting%20on%20moon%20looking%20back%20holding%20spoon%20artwork.png"
                alt="Angel on moon"
                className="drop-shadow-2xl animate-float w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
