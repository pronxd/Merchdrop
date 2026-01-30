import Link from "next/link";
import { getCollection } from "@/lib/mongodb";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Kassy Cakes",
  description: "Sweet stories, baking adventures, and confectionery chronicles from Kassandra Osorio in Austin, Texas.",
};

export const revalidate = 60; // Revalidate every 60 seconds

interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  content: string[];
  image?: string;
  published: boolean;
  createdAt: string;
}

async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const collection = await getCollection('blog_posts');
    const posts = await collection
      .find({ published: true })
      .sort({ createdAt: -1 })
      .toArray();

    // Convert MongoDB documents to plain objects
    return posts.map(post => ({
      _id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle || '',
      date: post.date,
      content: Array.isArray(post.content) ? post.content : [post.content || ''],
      image: post.image,
      published: post.published,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

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
            Kassy Cakes Blog
          </h1>
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

      {/* Blog Posts */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <img
              src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
              alt="Angel with cupcake"
              className="w-32 h-auto mx-auto mb-6 opacity-60"
            />
            <h2 className="font-playfair text-3xl text-deepBurgundy mb-4">No blog posts yet</h2>
            <p className="font-cormorant text-xl text-deepBurgundy/70">
              Check back soon for sweet stories and baking adventures!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post._id}
                className="bg-white rounded-lg overflow-hidden baroque-shadow hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Featured Image - Full width banner */}
                {post.image && (
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className="relative w-full aspect-video bg-gray-100">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  </Link>
                )}

                {/* Content */}
                <div className="p-5 md:p-6">
                  {/* Date Badge */}
                  <div className="inline-block px-4 py-1 bg-kassyPink/20 rounded-full mb-4">
                    <span className="font-cormorant text-deepBurgundy font-semibold">
                      {post.date}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="font-playfair text-3xl md:text-4xl font-bold text-deepBurgundy mb-2 hover:text-kassyPink transition-colors">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="font-cormorant text-xl text-deepBurgundy/80 italic mb-4">
                    {post.subtitle}
                  </p>

                  <p className="font-cormorant text-lg text-deepBurgundy/90 leading-relaxed mb-6 line-clamp-3">
                    {post.content[0]}
                  </p>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
                  >
                    Read More
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

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
