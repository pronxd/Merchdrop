"use client";

const testimonials = [
  {
    text: "Kassy is a very talented baker and artist! I am always amazed with her designs and it's always a bonus that her cakes taste delicious as well! I stumbled upon her page on instagram last year and already ordered multiple times from her whenever i give birthday cakes to my friends! And my only request from my birthday last June was that my cake should be from Kassycakes! That's how much i love her cakes!",
    author: "Janela M",
  },
  {
    text: "10/10 amazing experience. Kassandra's decorating style is so impressive and unique. Every cake she makes is absolutely stunning and one-of-a-kind. Ultimately, the frosting animal characters are what sealed the deal for me and my birdie cake was cuter than I had even imagined. The pumpkin spice/caramel/almond flavors were so delicious and the cake never dried out in the fridge in the original box. Totally worth the 1 hour drive!",
    author: "Caroline Wageman",
  },
  {
    text: "I ordered a cake for my friend's birthday and she loved it and it was seriously better than I imagined! It was also very delicious!! Honestly, it's hard to find someone who can create such a beautiful cake AND have it taste amazing but Kassy nailed it!!! Kassy was very easy to work with and responds quickly to messages. I will definitely order more cakes in the future.",
    author: "Jackie W",
  },
];

export default function Reviews() {
  return (
    <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-[#fce8f3] to-creamWhite">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-deepBurgundy mb-4">
            What Our Customers Say
          </h2>

          {/* Google Rating Badge */}
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-kassyPink/20">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-6 h-6 fill-baroqueGold text-baroqueGold"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="font-playfair text-3xl font-bold text-deepBurgundy">4.9</span>
            <span className="font-cormorant text-lg text-deepBurgundy/70">(37 reviews)</span>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-kassyPink/10 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Quote marks */}
              <div className="font-playfair text-6xl text-kassyPink/30 leading-none mb-2">"</div>

              <p className="font-cormorant text-lg text-deepBurgundy/90 leading-relaxed mb-4">
                {testimonial.text}
              </p>

              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 fill-baroqueGold text-baroqueGold"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="font-cormorant text-sm text-deepBurgundy/60 italic">
                  — {testimonial.author}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA to Google Reviews */}
        <div className="text-center">
          <a
            href="https://www.google.com/search?sca_esv=f52890924d9e52b9&si=AMgyJEtREmoPL4P1I5IDCfuA8gybfVI2d5Uj7QMwYCZHKDZ-E8SVQNy8xeIH8KISnBFBZWi60rOVCKGygQmw5FMX768HHMch25OXzuf9yxI3Yiow1rMM15i0soB2pIZdey7kRlK6N_p4&q=Kassy+Cakes+Reviews&sa=X&ved=2ahUKEwiIt_2AxM2RAxW9IzQIHZT_EsoQ0bkNegQILxAD&biw=1623&bih=817&dpr=1.57"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-cormorant text-lg text-deepBurgundy hover:text-kassyPink transition-colors duration-300 underline underline-offset-4 decoration-kassyPink/30 hover:decoration-kassyPink"
          >
            See all reviews on Google
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
