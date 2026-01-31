export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  month: string;
  year: string;
  content: string[];
  image?: string;
}

export const blogPosts: BlogPost[] = [];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
