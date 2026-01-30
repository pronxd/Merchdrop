import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/mongodb";
import Footer from "@/components/Footer";
import PostAudioPlayer from "@/components/PostAudioPlayer";

export const revalidate = 60; // Revalidate every 60 seconds

interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  content: string[];
  image?: string;
  audio?: string;
  published: boolean;
  createdAt: string;
}

async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const collection = await getCollection('blog_posts');
    const post = await collection.findOne({ slug, published: true });

    if (!post) return null;

    return {
      _id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle || '',
      date: post.date,
      content: Array.isArray(post.content) ? post.content : [post.content || ''],
      image: post.image,
      audio: post.audio,
      published: post.published,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

async function getAdjacentPosts(currentSlug: string): Promise<{ prev: BlogPost | null; next: BlogPost | null }> {
  try {
    const collection = await getCollection('blog_posts');
    const posts = await collection
      .find({ published: true })
      .sort({ createdAt: -1 })
      .toArray();

    const currentIndex = posts.findIndex(p => p.slug === currentSlug);

    const formatPost = (post: any): BlogPost => ({
      _id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle || '',
      date: post.date,
      content: Array.isArray(post.content) ? post.content : [post.content || ''],
      image: post.image,
      published: post.published,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
    });

    return {
      prev: currentIndex < posts.length - 1 ? formatPost(posts[currentIndex + 1]) : null,
      next: currentIndex > 0 ? formatPost(posts[currentIndex - 1]) : null,
    };
  } catch (error) {
    console.error('Error fetching adjacent posts:', error);
    return { prev: null, next: null };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog Post Not Found - Kassy Cakes",
    };
  }

  return {
    title: `${post.title} - Kassy Cakes Blog`,
    description: post.content[0]?.substring(0, 160) || '',
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { prev: prevPost, next: nextPost } = await getAdjacentPosts(slug);

  return (
    <div className="min-h-screen bg-creamWhite">
      {/* Spacer for navigation */}
      <div className="h-4"></div>

      {/* Blog Post */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Post Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-6 py-2 bg-kassyPink/20 rounded-full mb-6">
            <span className="font-cormorant text-deepBurgundy font-semibold text-lg">
              {post.date}
            </span>
          </div>

          <h1 className="font-playfair text-5xl md:text-6xl font-bold text-deepBurgundy mb-4">
            {post.title}
          </h1>

          <p className="font-cormorant text-2xl text-deepBurgundy/80 italic">
            {post.subtitle}
          </p>

          {/* Ornamental Divider */}
          <div className="mt-8 mb-12">
            <svg viewBox="0 0 200 20" className="w-64 mx-auto" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 10 Q 50 5, 100 10 T 200 10" stroke="#d4af37" fill="none" strokeWidth="2" />
              <circle cx="100" cy="10" r="4" fill="#d4af37" />
              <circle cx="50" cy="8" r="2.5" fill="#d4af37" />
              <circle cx="150" cy="8" r="2.5" fill="#d4af37" />
            </svg>
          </div>
        </div>

        {/* Featured Image */}
        {post.image && (
          <div className="mb-12 ornamental-border rounded-lg overflow-hidden bg-white p-4 baroque-shadow">
            <div className="relative aspect-video">
              <img
                src={post.image}
                alt={post.title}
                className="object-cover rounded w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Audio Player */}
        {post.audio && (
          <div className="mb-12">
            <PostAudioPlayer src={post.audio} title="Listen to Kassy" />
          </div>
        )}

        {/* Post Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-white rounded-lg p-8 md:p-12 baroque-shadow">
            {post.content.map((paragraph, index) => (
              <p
                key={index}
                className="font-cormorant text-xl text-deepBurgundy/90 leading-relaxed mb-6 last:mb-0"
              >
                {paragraph}
              </p>
            ))}

            {/* Author Signature */}
            <div className="mt-12 pt-8 border-t-2 border-baroqueGold">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 relative">
                  <img
                    src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
                    alt="Kassy Cakes"
                    className="object-contain w-full h-full"
                  />
                </div>
                <div>
                  <p className="font-playfair text-2xl text-deepBurgundy font-semibold">
                    Kassandra Osorio
                  </p>
                  <p className="font-cormorant text-lg text-deepBurgundy/70">
                    Baker & Cake Designer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation to Other Posts */}
        {(prevPost || nextPost) && (
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            {prevPost && (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="bg-white rounded-lg p-6 baroque-shadow hover:shadow-xl transition-shadow group"
              >
                <p className="font-cormorant text-deepBurgundy/60 mb-2">← Previous Post</p>
                <h3 className="font-playfair text-xl font-semibold text-deepBurgundy group-hover:text-kassyPink transition-colors">
                  {prevPost.title}
                </h3>
                <p className="font-cormorant text-deepBurgundy/70 mt-1">{prevPost.date}</p>
              </Link>
            )}

            {nextPost && (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="bg-white rounded-lg p-6 baroque-shadow hover:shadow-xl transition-shadow group md:text-right"
              >
                <p className="font-cormorant text-deepBurgundy/60 mb-2">Next Post →</p>
                <h3 className="font-playfair text-xl font-semibold text-deepBurgundy group-hover:text-kassyPink transition-colors">
                  {nextPost.title}
                </h3>
                <p className="font-cormorant text-deepBurgundy/70 mt-1">{nextPost.date}</p>
              </Link>
            )}
          </div>
        )}

        {/* Back to Blog Button */}
        <div className="text-center mt-12">
          <Link
            href="/blog"
            className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
          >
            View All Blog Posts
          </Link>
        </div>

        {/* Decorative Angel */}
        <div className="mt-16 flex justify-center">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20sitting%20on%20moon%20looking%20back%20holding%20spoon%20artwork.png"
            alt="Angel on moon"
            className="drop-shadow-2xl opacity-70 w-48 h-auto"
          />
        </div>
      </article>

      <Footer />
    </div>
  );
}
