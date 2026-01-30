"use client";

import Footer from "@/components/Footer";
import OrderAssistantChat from "@/components/OrderAssistantChat";
import { useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-kassyPink/20 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-4 px-2 flex justify-between items-center text-left hover:bg-kassyPink/5 transition-colors"
      >
        <span className="font-cormorant text-lg text-deepBurgundy pr-4">{item.question}</span>
        <svg
          className={`w-5 h-5 text-kassyPink transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}
      >
        <p className="font-cormorant text-base text-deepBurgundy/80 px-2 leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

function FAQSection({ category, openIndex, setOpenIndex, sectionIndex }: {
  category: FAQCategory;
  openIndex: string | null;
  setOpenIndex: (index: string | null) => void;
  sectionIndex: number;
}) {
  return (
    <div className="bg-white rounded-lg baroque-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-kassyPink to-deepBurgundy p-4 flex items-center gap-3">
        {category.icon}
        <h2 className="font-playfair text-xl md:text-2xl font-bold text-white">
          {category.title}
        </h2>
      </div>
      <div className="p-4">
        {category.items.map((item, idx) => {
          const key = `${sectionIndex}-${idx}`;
          return (
            <FAQAccordion
              key={key}
              item={item}
              isOpen={openIndex === key}
              onToggle={() => setOpenIndex(openIndex === key ? null : key)}
            />
          );
        })}
      </div>
    </div>
  );
}

const faqCategories: FAQCategory[] = [
  {
    title: "Pricing & Orders",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      { question: "How much does a custom cake cost?", answer: "Custom cakes start at $130." },
      { question: "Do you have a minimum order amount?", answer: "Yes, I can only take on 2-3 cakes per day." },
      { question: "Is there an extra charge for intricate designs?", answer: "Yes, there are certain add-ons you can include to your cake order for an extra cost such as edible images and pearls." },
      { question: "How much is delivery, and does it vary by location?", answer: "Yes, delivery is typically $25-45 but exact amount depends on location." },
      { question: "Are there additional fees for fondant versus buttercream?", answer: "I do not work with fondant. All of my cakes are buttercream only. I plan to feature whip cream cakes in the future. No fondant cakes for the foreseeable future." },
      { question: "What is the cost for adding edible images or toppers?", answer: "Edible images are $20 extra." },
      { question: "Do you charge extra for rush orders?", answer: "Yes, rush orders have a fee (typically $30) and need to be discussed directly with me via Instagram DMs." },
      { question: "How much would a 3-tier wedding cake cost for 100 people?", answer: "Starts at $1,700 but depends on design." },
      { question: "Is there a tasting fee, and is it refundable?", answer: "I do not offer tastings at the moment." },
    ]
  },
  {
    title: "Cake Sizes & Servings",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
      </svg>
    ),
    items: [
      { question: "How many servings does a standard cake size provide?", answer: "My 6 inch cake serves 8-12 people and my 8 inch serves 12-24 people." },
      { question: "What size cake do I need for 50 guests?", answer: "For tiered I can do 8\"6\" and 4\"." },
      { question: "Can you make sheet cakes for large events?", answer: "I currently only offer miniature sheet cakes in the size of 9x13." },
      { question: "How do you calculate servings for a sculpted cake?", answer: "I don't offer sculpted cakes." },
      { question: "Can I get a cake that's half one flavor and half another?", answer: "No, I only offer single flavors for each cake. Mixing them is not available." },
      { question: "Is there a maximum size you can make?", answer: "I currently offer the largest tier of 10\"8\" and 6\"." },
      { question: "What about smash cakes for babies?", answer: "Yes! These can be made in my 6\" cake size." },
    ]
  },
  {
    title: "Flavors, Fillings & Ingredients",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    items: [
      { question: "What cake flavors do you offer?", answer: "I offer vanilla, chocolate, red velvet, strawberry, lemon, pumpkin spice (seasonal), and confetti." },
      { question: "Can I mix and match flavors in different tiers?", answer: "For tiered wedding cakes this option is available for extra cost." },
      { question: "What fillings are available, like fruit or ganache?", answer: "I have mixed berry compote, strawberry compote, fresh whip cream, vanilla custard, cream cheese frosting, plain vanilla frosting, and plain chocolate frosting." },
      { question: "Do you have gluten-free options?", answer: "Not at this time." },
      { question: "Are there vegan or dairy-free cakes?", answer: "Not at this time." },
      { question: "What about nut-free cakes for allergies?", answer: "My signature Swiss meringue frosting contains a small amount of almond extract, but this can be omitted upon request." },
      { question: "Can you make a cake with fresh fruit inside?", answer: "I do not offer fresh fruit at this time as sometimes customers pick up cakes several days in advance and I don't want to chance the fruit spoiling." },
      { question: "Can I request a specific flavor?", answer: "I only offer my current menu at this time." },
    ]
  },
  {
    title: "Design & Customization",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    items: [
      { question: "Can you replicate a cake design from a photo?", answer: "I can try my best, but please note I try and add my own touches to the cake and I refrain from doing exact copies of someone else's work as much as possible." },
      { question: "What themes do you specialize in, like weddings or birthdays?", answer: "My biggest sellers are birthday and anniversary cakes." },
      { question: "Do you do 3D sculpted cakes, like cars or animals?", answer: "I do not currently offer this at this time." },
      { question: "Can I add fresh flowers to the cake?", answer: "Yes! Fresh flowers are a current add-on selection for $15 extra." },
      { question: "Are metallic accents possible?", answer: "I do offer gold and silver edible pearls." },
      { question: "How do you handle custom toppers, like monograms?", answer: "I do not offer monograms." },
      { question: "Can you incorporate LED lights or other special effects?", answer: "No." },
      { question: "What if I want a cake with a surprise inside, like pinata style?", answer: "No." },
      { question: "Do you offer hand-painted designs?", answer: "Yes! This option is $30 extra in the add-on selection box. Please discuss your design with me directly via Instagram DMs to see if the design is possible." },
    ]
  },
  {
    title: "Dietary Restrictions & Allergies",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    items: [
      { question: "How do you handle cross-contamination for allergies?", answer: "I currently do not offer 100% allergy-free products at this time. My kitchen comes in contact with wheat, dairy, eggs, soy, and tree nuts." },
      { question: "Can you make sugar-free cakes?", answer: "No." },
      { question: "What egg-free options do you have?", answer: "None." },
      { question: "Are your cakes kosher or halal certified?", answer: "Not at this time." },
      { question: "Do you use organic ingredients?", answer: "Yes! I try to source organic ingredients whenever possible." },
      { question: "Can I get a low-carb or keto-friendly cake?", answer: "No." },
      { question: "What about cakes for diabetics?", answer: "Not at this time." },
      { question: "How do you label ingredients for allergens?", answer: "My kitchen comes in contact with wheat, dairy, soy, eggs, and tree nuts. None of my products are allergy friendly." },
      { question: "Can you substitute ingredients for specific diets?", answer: "No." },
      { question: "Do you test for common allergens like peanuts?", answer: "No." },
    ]
  },
  {
    title: "Ordering Process & Timeline",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    items: [
      { question: "How far in advance should I place an order?", answer: "I prefer 2 weeks in advance, 5 days minimum. For wedding orders, 1-3 months is preferred." },
      { question: "What's the process for a consultation?", answer: "I'm always happy to take your questions directly via Instagram messages. I don't offer in-person consultations. Phone calls are also not preferable as I like to have a record of written details." },
      { question: "Do you require a deposit?", answer: "No. Payments are made in full at time of ordering." },
      { question: "Can I make changes to my order after confirming?", answer: "Yes, changes can be made so long as they are given to me within a timely manner." },
      { question: "How long does it take to decorate a cake?", answer: "Cakes can take anywhere from 2-6 hours to decorate. Tiered wedding cakes are often much longer." },
      { question: "What if I need a cake last-minute?", answer: "It depends on my schedule. Please reach out directly via Instagram messages to see if it's doable." },
      { question: "Do you offer virtual consultations?", answer: "No." },
      { question: "What's your cancellation policy?", answer: "No refunds are available after purchase. Serious buyers only please." },
    ]
  },
  {
    title: "Delivery, Setup & Pickup",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    items: [
      { question: "Do you deliver, and to what areas?", answer: "Yes! Delivery can be made locally in Kyle, Texas for free, and in surrounding Austin area for an additional fee." },
      { question: "How much notice do you need for delivery?", answer: "5 days in advance preferred." },
      { question: "Can you set up the cake at the venue?", answer: "Yes, upon request!" },
      { question: "What if the venue is outdoors?", answer: "Cake should not be left in direct sunlight if outdoors. Warm temperatures may cause the cake to melt or crack." },
      { question: "How do you transport tiered cakes safely?", answer: "Cakes must be leveled at all times before, during, and after transport. Always carry the cake box from the bottom. Cake should be in a temperature-controlled environment to ensure it doesn't melt." },
      { question: "Is pickup available, and what are your hours?", answer: "Yes! Pickup is always available, usually from 11am-7pm. Other times can usually be accommodated upon request." },
      { question: "Can I arrange for someone else to pick up the cake?", answer: "Yes!" },
    ]
  },
  {
    title: "Payment & Policies",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    items: [
      { question: "Is a contract required for large orders?", answer: "Yes." },
      { question: "Do you offer payment plans?", answer: "No." },
      { question: "What's your refund policy?", answer: "No refunds available. Strictly NO REFUNDS." },
      { question: "Do you ship cakes long-distance?", answer: "No shipping available." },
    ]
  },
  {
    title: "Care, Storage & Serving",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    items: [
      { question: "How should I store the cake before the event?", answer: "Cake should be in the fridge the day before your event. If you have placed your cake in the freezer, take out of freezer and place in the fridge the day before your event. On the day of your event, take out of fridge 2-6 hours (depending on size) to reach room temperature." },
      { question: "How long does a cake stay fresh?", answer: "5 days in the fridge or 2 weeks in the freezer." },
      { question: "Can I freeze leftover cake?", answer: "Yes!" },
    ]
  },
  {
    title: "General & Miscellaneous",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      { question: "What inspired your cake designs?", answer: "I get inspiration from everywhere, but my cakes are very inspired by vintage Wilton cookbooks." },
      { question: "Do you have client testimonials?", answer: "Check out my Google reviews!" },
      { question: "What's your busiest season?", answer: "Valentine's!" },
      { question: "Can you accommodate same-day tastings?", answer: "No tastings available." },
    ]
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const { settings: siteSettings } = useSiteSettings();

  // Hide floating button when near bottom of page (mobile)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Hide button when within 200px of bottom
      const nearBottom = scrollTop + windowHeight >= documentHeight - 200;
      setIsFooterVisible(nearBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAskKassy = () => {
    if (!showChat) {
      const audio = new Audio('https://kassy.b-cdn.net/audio/openchat.MP3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
    setShowChat(true);
  };

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
            FAQ
          </h1>
          <p className="font-cormorant text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Answers to common questions about ordering custom cakes from Kassycakes
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

      {/* FAQ Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8">
          {faqCategories.map((category, idx) => (
            <FAQSection
              key={idx}
              category={category}
              openIndex={openIndex}
              setOpenIndex={setOpenIndex}
              sectionIndex={idx}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center p-8 bg-white rounded-lg baroque-shadow">
          <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-4">
            Still Have Questions?
          </h3>
          <p className="font-cormorant text-lg text-deepBurgundy/80 mb-6">
            Reach out to me directly via Instagram DMs for any questions not covered here!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://www.instagram.com/_kassycakes_/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              Message on Instagram
            </a>
            <a
              href="/cakes"
              className="inline-block bg-deepBurgundy hover:bg-baroqueGold text-white font-playfair px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              Browse Cakes
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

      {/* Floating Ask Kassy Button - hides when footer is visible on mobile, or when chatbot is disabled */}
      {siteSettings.chatbotEnabled && !isFooterVisible && (
        <button
          onClick={handleAskKassy}
          className="fixed bottom-8 right-8 bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-6 py-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 z-40"
        >
          💬 Ask Kassy
        </button>
      )}

      {/* AI Chat Modal */}
      {siteSettings.chatbotEnabled && (
        <OrderAssistantChat
          selectedProduct={null}
          onClose={() => setShowChat(false)}
          isMessengerStyle={true}
          isVisible={showChat}
        />
      )}

      <Footer />
    </div>
  );
}
