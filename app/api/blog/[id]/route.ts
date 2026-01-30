import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET single blog post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getCollection('blog_posts');

    // Try to find by ObjectId first, then by slug
    let post;
    if (ObjectId.isValid(id)) {
      post = await collection.findOne({ _id: new ObjectId(id) });
    }
    if (!post) {
      post = await collection.findOne({ slug: id });
    }

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}

// PUT update blog post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getCollection('blog_posts');
    const body = await request.json();

    // Generate slug from title if title changed
    let slug = body.slug;
    if (body.title && !body.slug) {
      slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Parse date for month/year if date changed
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (body.title !== undefined) updateData.title = body.title;
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.audio !== undefined) updateData.audio = body.audio;
    if (body.published !== undefined) updateData.published = body.published;
    if (body.content !== undefined) {
      updateData.content = Array.isArray(body.content) ? body.content : [body.content];
    }

    if (slug) {
      updateData.slug = slug;
    }

    if (body.date) {
      const monthMatch = months.find(m => body.date.includes(m));
      if (monthMatch) updateData.month = monthMatch;
      const yearMatch = body.date.match(/\d{4}/);
      if (yearMatch) updateData.year = yearMatch[0];
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

// DELETE blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getCollection('blog_posts');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}
