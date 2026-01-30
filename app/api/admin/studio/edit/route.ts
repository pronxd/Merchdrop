import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, model } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'FAL API key not configured' }, { status: 500 });
    }

    // Choose model - v4 or v4.5 (default)
    const modelId = model === 'v4'
      ? 'fal-ai/bytedance/seedream/v4/edit'
      : 'fal-ai/bytedance/seedream/v4.5/edit';

    console.log('Processing image with Seedream:', { imageUrl, prompt, modelId });

    // Call FAL Seedream API
    const result = await fal.subscribe(modelId, {
      input: {
        prompt: prompt,
        image_urls: [imageUrl],
        image_size: "auto_4K",
        num_images: 1,
        max_images: 1,
        enable_safety_checker: false
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_QUEUE") {
          console.log("Seedream: In queue...");
        } else if (update.status === "IN_PROGRESS") {
          console.log("Seedream: Processing...");
        }
      }
    });

    console.log('Seedream result:', result);

    if (result.data?.images && result.data.images.length > 0) {
      return NextResponse.json({
        success: true,
        editedImageUrl: result.data.images[0].url,
        seed: result.data.seed
      });
    } else {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Seedream API error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process image'
    }, { status: 500 });
  }
}
