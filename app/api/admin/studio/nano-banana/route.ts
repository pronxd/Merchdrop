import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    console.log('Processing image with Nano Banana Pro:', { imageUrl, prompt });

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch source image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine mime type from URL or default to jpeg
    const mimeType = imageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

    // Call Gemini API with Nano Banana Pro model (Gemini 3 Pro Image)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Nano Banana result:', JSON.stringify(result, null, 2));

    // Check for safety block
    if (result.candidates && result.candidates[0]?.finishReason === 'IMAGE_SAFETY') {
      console.error('Image blocked by safety filter');
      return NextResponse.json({
        error: 'Image blocked by Google safety filter. Try a different photo or edit.'
      }, { status: 400 });
    }

    // Extract the image from the response
    if (result.candidates && result.candidates[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          // Return the base64 image as a data URL
          const editedImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return NextResponse.json({
            success: true,
            editedImageUrl
          });
        }
      }
    }

    // Log unexpected response for debugging
    console.error('Unexpected response structure:', JSON.stringify(result, null, 2));
    return NextResponse.json({ error: 'No image generated - try again' }, { status: 500 });

  } catch (error: any) {
    console.error('Nano Banana API error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process image'
    }, { status: 500 });
  }
}
