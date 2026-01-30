import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-creamWhite flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
            alt="Angel with cupcake"
            className="mx-auto drop-shadow-xl w-48 h-auto"
          />
        </div>

        <h1 className="font-playfair text-5xl md:text-6xl font-bold text-deepBurgundy mb-4">
          Blog Post Not Found
        </h1>

        <p className="font-cormorant text-xl text-deepBurgundy/80 mb-8">
          Oops! This sweet story seems to have wandered off. Let's get you back to the main blog.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/blog"
            className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
          >
            View All Blog Posts
          </Link>
          <Link
            href="/"
            className="inline-block bg-deepBurgundy hover:bg-baroqueGold text-white font-playfair text-lg px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
