import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface BlogPost {
  _id?: ObjectId;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  month: string;
  year: string;
  content: string[]; // Array of paragraphs
  image?: string;
  audio?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET all blog posts
export async function GET(request: NextRequest) {
  try {
    const collection = await getCollection('blog_posts');
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const query = publishedOnly ? { published: true } : {};
    const posts = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

// POST create new blog post
export async function POST(request: NextRequest) {
  try {
    const collection = await getCollection('blog_posts');
    const body = await request.json();

    // Generate slug from title
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Parse date for month/year
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    // Try to parse month from date string
    let month = months[new Date().getMonth()];
    let year = new Date().getFullYear().toString();

    if (body.date) {
      const monthMatch = months.find(m => body.date.includes(m));
      if (monthMatch) month = monthMatch;
      const yearMatch = body.date.match(/\d{4}/);
      if (yearMatch) year = yearMatch[0];
    }

    const newPost: Omit<BlogPost, '_id'> = {
      slug: body.slug || slug,
      title: body.title,
      subtitle: body.subtitle || '',
      date: body.date || `${month} ${year}`,
      month: month,
      year: year,
      content: Array.isArray(body.content) ? body.content : [body.content || ''],
      image: body.image || '',
      audio: body.audio || '',
      published: body.published ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newPost);

    return NextResponse.json({
      ...newPost,
      _id: result.insertedId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}
